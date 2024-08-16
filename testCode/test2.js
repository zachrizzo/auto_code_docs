//remove eslint whole file
/* eslint-disable */

const functions = require('firebase-functions');

const admin = require('firebase-admin');
const { parse, format, isValid, differenceInMinutes, differenceInSeconds, differenceInHours, differenceInMonths, startOfMonth, addMonths, endOfMonth, eachDayOfInterval, addDays, min } = require('date-fns');
// const { nanoid } = require('nanoid');
const moment = require('moment-timezone');
const { convertRepeatingDaysIntoCalenderDays } = require('./lib/lib');
const { getSessionGroupKey, isTimeSlotConflicting } = require('./group');
const { convertTimeStringToMinutes } = require('./lib/time');
const { randomColor } = require('./lib/color');
const { teacherAvailability } = require('./availability/teacher');
const { userAvailability } = require('./availability/user');
const { schoolAvailability } = require('./availability/school');


const updateTheFrontEndWithProgress = async (progress, userId, progressDocRef) => {
    console.log('Progress:', progress);
    // Update the progress document in Firestore
    const newProgress = {
        percentage: progress.percentage,
        lastUpdated: new Date(),
        type: 'schedule',
        updateMessage: progress.message,
        owner: userId
    };

    await progressDocRef.set(newProgress, { merge: true });
};

const calculateMonthOccurrencesDates = (start, end, frequency, availWeekDays) => {
    const months = differenceInMonths(end, start) + 1;
    const occurrences = [];
    const missingSessions = [];

    for (let i = 0; i < months; i++) {
        const currentMonthStart = startOfMonth(addMonths(start, i));
        const currentMonthEnd = min([endOfMonth(currentMonthStart), end]);

        let availableDays = [];

        let currentDate = currentMonthStart;
        while (currentDate <= currentMonthEnd) {
            const dayAbbr = format(currentDate, 'EEE').toUpperCase().slice(0, 2);
            if (availWeekDays.includes(dayAbbr)) {
                availableDays.push(currentDate);
            }
            currentDate = addDays(currentDate, 1);
        }

        // Now, evenly distribute the occurrences for this month
        if (frequency > 0 && availableDays.length > 0) {
            const monthlyFrequency = Math.min(frequency, availableDays.length);
            const step = (availableDays.length - 1) / (monthlyFrequency - 1);
            for (let j = 0; j < monthlyFrequency; j++) {
                const index = Math.min(Math.round(j * step), availableDays.length - 1);
                occurrences.push(availableDays[index]);
            }
        }

        // If there aren't enough available days to fulfill the frequency, mark the session as missing
        if (availableDays.length < frequency) {
            missingSessions.push({
                month: format(currentMonthStart, 'MMM yyyy'),
                missing: frequency - availableDays.length
            });
        }
    }

    return occurrences;
};


const createCalendarForEachSchool = async (schools, userId) => {

    const db = admin.firestore();
    const calendars = {};
    const batch = db.batch();

    for (const school of schools) {
        const { id, name } = school;
        const calendar = {
            active: true,
            author: 'admin',
            color: randomColor(),
            lastUpdate: userId,
            lastUsed: new Date(),
            name: name,
            owner: userId,
            positionedAfter: null,
            roles: {
                any: [userId],
                editor: [],
                owner: [userId],
                viewer: []
            },
            system: false,
        };

        const calendarRef = db.collection('calendars').doc();
        batch.set(calendarRef, calendar);

        // Store the calendar data and reference separately in the calendars object
        calendars[id] = {
            data: calendar,
            ref: calendarRef
        };
    }

    try {
        await batch.commit();
        console.log('Batch write completed');
    } catch (error) {
        console.error('Error writing batch: ', error);
        throw error; // Re-throw the error to be handled by the caller
    }

    return calendars;
}







const createAndGroupSessions = (ieps, schoolAvailability, teacherAvailability, userAvailability, unscheduledStudents, scheduledStudents, userId, calendars, studentsPerSession, schools, userTimezone) => {
    //loop through each iep
    const sessions = [];
    let iepEndDate = null



    ieps.forEach((iep) => {

        const { SDIs, school, studentName, schoolId, schoolYearsId, studentId, iepEnd } = iep;
        iepEndDate = iepEnd;

        const periodToDays = {
            'Daily': 1,
            'Weekly': 5,  // Monday through Friday
            'Monthly': 20, // Approximate number of weekdays in a month
            'Yearly': 260 // Approximate number of weekdays in a year
        };




        const generateSDISessions = (currentSchoolAvail, sdi) => {
            const generatedSessions = [];
            const unscheduledDays = [];
            const { durationType, duration, frequency, period, location } = sdi;
            const durationInMinutes = durationType === 'Hours' ? parseInt(duration) * 60 : parseInt(duration);
            const periodDays = periodToDays[period];
            const frequencyPerPeriod = parseInt(frequency);

            if (!currentSchoolAvail) {
                console.log("No school availability found");
                return { generatedSessions, unscheduledDays };
            }

            const availableDates = Object.keys(currentSchoolAvail).sort();
            const iepEndDate = new Date(iepEnd);
            let currentDate = new Date(availableDates[0]);

            while (currentDate <= iepEndDate) {
                let sessionsThisPeriod = 0;

                for (let dayIndex = 0; dayIndex < periodDays && currentDate <= iepEndDate; dayIndex++) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const { start, end } = currentSchoolAvail[dateStr] || { start: null, end: null };

                    const dayOfWeek = currentDate.getDay().toString();
                    const userDayAvailability = userAvailability[schoolYearsId][dayOfWeek];

                    if (start && end && currentDate.getDay() !== 5 && currentDate.getDay() !== 6 && userDayAvailability && userDayAvailability.length > 0) {
                        const startTimeMinutes = convertTimeStringToMinutes(start);
                        const endTimeMinutes = convertTimeStringToMinutes(end);

                        if (startTimeMinutes !== null && endTimeMinutes !== null) {
                            const availableMinutes = endTimeMinutes - startTimeMinutes;
                            if (availableMinutes >= durationInMinutes) {
                                sdi.details.forEach(individualSDI => {
                                    if (sessionsThisPeriod >= frequencyPerPeriod) return;

                                    const key = `${studentId}-${individualSDI.title}`;
                                    let sessionStartMinutes = startTimeMinutes;
                                    let foundValidSlot = false;

                                    while (sessionStartMinutes + durationInMinutes <= endTimeMinutes && !foundValidSlot) {
                                        let sessionStart = new Date(currentDate);
                                        sessionStart.setHours(0, sessionStartMinutes, 0, 0);

                                        let sessionEnd = new Date(sessionStart);
                                        sessionEnd.setMinutes(sessionEnd.getMinutes() + durationInMinutes);

                                        const newSession = {
                                            studentId: studentId,
                                            start: sessionStart.toISOString(),
                                            end: sessionEnd.toISOString(),
                                            school: school,
                                            studentName: studentName,
                                            schoolYearsId: schoolYearsId,
                                            sdi: { ...sdi, details: [individualSDI] },
                                            key: sdi.id + '-' + individualSDI.title
                                        };

                                        if (!isTimeSlotConflicting(sessionStart, sessionEnd, generatedSessions, currentSchoolAvail, teacherAvailability, userAvailability, sessions, schoolYearsId, newSession)) {
                                            foundValidSlot = true;
                                            generatedSessions.push(newSession);
                                            break;
                                        } else {
                                            sessionStartMinutes += 5;
                                        }
                                    }

                                    if (!foundValidSlot) {
                                        unscheduledDays.push(dateStr);
                                        console.log(`Could not find a valid slot for SDI ${key} on ${currentDate.toDateString()}`);
                                    }
                                });
                            }
                        }
                    } else {
                        unscheduledDays.push(dateStr);
                    }

                    currentDate.setDate(currentDate.getDate() + 1);

                    if (dayIndex === periodDays - 1) {
                        sessionsThisPeriod++;
                    }
                }

                if (currentDate <= iepEndDate) {
                    if (period === 'Weekly') {
                    } else if (period === 'Monthly') {
                        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                    } else if (period === 'Yearly') {
                        currentDate = new Date(currentDate.getFullYear() + 1, 0, 1);
                    }
                }
            }

            return generatedSessions;
        };



        const schoolAvailabilityForIEP = schoolAvailability[schoolYearsId];



        SDIs.forEach(sdi => {
            const sdiSessions = generateSDISessions(schoolAvailabilityForIEP, sdi) || [];
            sessions.push(...sdiSessions);
        });



        if (sessions.length === 0) {
            unscheduledStudents.push(studentId);
        } else {
            scheduledStudents.push(studentId);
        }


    });

    const findCommonAvailableTime = (sessions, teacherAvailability, userAvailability, schoolAvailability, existingGroupedSessions) => {
        const day = new Date(sessions[0].start).toISOString().split('T')[0];
        const schoolDayAvailability = schoolAvailability[sessions[0].schoolYearsId][day];
        const sessionDuration = new Date(sessions[0].end) - new Date(sessions[0].start);

        if (!schoolDayAvailability) return null;

        const convertTo24Hour = (time12h) => {
            const [time, modifier] = time12h.split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') {
                hours = '00';
            }
            if (modifier === 'PM') {
                hours = parseInt(hours, 10) + 12;
            }
            return `${hours}:${minutes}`;
        };

        const schoolStartTime = convertTo24Hour(schoolDayAvailability.start);
        const schoolEndTime = convertTo24Hour(schoolDayAvailability.end);

        const schoolStart = new Date(`${day}T${schoolStartTime}:00`);
        const schoolEnd = new Date(`${day}T${schoolEndTime}:00`);

        for (let time = schoolStart; time < schoolEnd; time.setMinutes(time.getMinutes() + 5)) {
            const potentialEnd = new Date(time.getTime() + sessionDuration);

            // Check if the time slot overlaps with any existing grouped sessions
            const overlapsExisting = existingGroupedSessions.some(existingSession => {
                const existingStart = new Date(existingSession.start);
                const existingEnd = new Date(existingSession.end);
                return (time < existingEnd && potentialEnd > existingStart);
            });

            if (overlapsExisting) continue;

            const isCompatible = sessions.every(session =>
                !isTimeSlotConflicting(
                    time,
                    potentialEnd,
                    {},  // currentStudentsSchedule is empty as we're checking for a new common time
                    schoolAvailability[session.schoolYearsId],
                    teacherAvailability,
                    userAvailability,
                    [],  // existingSchedule is empty as we're checking for a new common time
                    session.schoolYearsId
                )
            );

            if (isCompatible) {
                return { start: time, end: potentialEnd };
            }
        }

        return null;
    };

    const groupAllSessions = (schoolAvailability, sessions, teacherAvailability, userAvailability, studentsPerSession) => {
        const groupedSessions = {};
        const sessionsByDay = {};

        const getUniqueSessionKey = (session) => {
            return `${session.sdi.details[0].title}-${session.schoolYearsId}-${session.studentId}`;
        };

        // First pass: separate sessions by day
        sessions.forEach(session => {
            const day = new Date(session.start).toISOString().split('T')[0];
            if (!sessionsByDay[day]) {
                sessionsByDay[day] = [];
            }
            sessionsByDay[day].push(session);
        });

        // Second pass: group sessions within each day
        Object.entries(sessionsByDay).forEach(([day, daySessions]) => {
            const processedSessionKeys = new Set();
            groupedSessions[day] = {};

            // Sort sessions by start time to prioritize earlier sessions
            daySessions.sort((a, b) => new Date(a.start) - new Date(b.start));

            daySessions.forEach(session => {
                const uniqueSessionKey = getUniqueSessionKey(session);
                if (processedSessionKeys.has(uniqueSessionKey)) return; // Skip if already processed

                const groupKey = getSessionGroupKey(session);
                if (!groupedSessions[day][groupKey]) {
                    groupedSessions[day][groupKey] = [];
                }

                const potentialGroup = [session];

                // Find potential group members with the same group key
                daySessions.forEach(otherSession => {
                    const otherUniqueSessionKey = getUniqueSessionKey(otherSession);

                    const otherGroupKey = getSessionGroupKey(otherSession);
                    if (groupKey === otherGroupKey && session.studentId !== otherSession.studentId && !processedSessionKeys.has(otherUniqueSessionKey)) {
                        potentialGroup.push(otherSession);
                    }
                });

                // Check if all sessions in the potential group have the same time
                const allSameTime = potentialGroup.every(s =>
                    s.start === potentialGroup[0].start && s.end === potentialGroup[0].end
                );

                if (allSameTime) {
                    // If all sessions have the same time, use that time for the group
                    if (potentialGroup.length >= studentsPerSession.min && potentialGroup.length <= studentsPerSession.max) {
                        groupedSessions[day][groupKey].push(...potentialGroup);
                    } else if (potentialGroup.length > studentsPerSession.max) {
                        // Split into smaller groups if exceeding max size
                        for (let i = 0; i < potentialGroup.length; i += studentsPerSession.max) {
                            const subGroup = potentialGroup.slice(i, i + studentsPerSession.max);
                            const subGroupKey = `${groupKey}-${i / studentsPerSession.max}`;
                            groupedSessions[day][subGroupKey] = subGroup;
                        }
                    } else {
                        // If less than min group size, keep as individual sessions
                        potentialGroup.forEach(s => {
                            const individualGroupKey = `${groupKey}-${s.studentId}`;
                            groupedSessions[day][individualGroupKey] = [s];
                        });
                    }
                } else {
                    // If sessions have different times, try to find a common time
                    const commonTime = findCommonAvailableTime(potentialGroup, teacherAvailability, userAvailability, schoolAvailability, Object.values(groupedSessions[day]).flat());

                    if (commonTime) {
                        // If common time found, use it for the group
                        const groupedSessionsForDay = potentialGroup.map(s => ({
                            ...s,
                            start: commonTime.start.toISOString(),
                            end: commonTime.end.toISOString()
                        }));

                        if (groupedSessionsForDay.length >= studentsPerSession.min && groupedSessionsForDay.length <= studentsPerSession.max) {
                            groupedSessions[day][groupKey].push(...groupedSessionsForDay);
                        } else if (groupedSessionsForDay.length > studentsPerSession.max) {
                            // Split into smaller groups if exceeding max size
                            for (let i = 0; i < groupedSessionsForDay.length; i += studentsPerSession.max) {
                                const subGroup = groupedSessionsForDay.slice(i, i + studentsPerSession.max);
                                const subGroupKey = `${groupKey}-${i / studentsPerSession.max}`;
                                groupedSessions[day][subGroupKey] = subGroup;
                            }
                        } else {
                            // If less than min group size, keep as individual sessions
                            groupedSessionsForDay.forEach(s => {
                                const individualGroupKey = `${groupKey}-${s.studentId}`;
                                groupedSessions[day][individualGroupKey] = [s];
                            });
                        }
                    } else {
                        // If no common time found, keep original time for each session in separate groups
                        potentialGroup.forEach(s => {
                            const individualGroupKey = `${groupKey}-${s.studentId}`;
                            if (!groupedSessions[day][individualGroupKey]) {
                                groupedSessions[day][individualGroupKey] = [];
                            }
                            groupedSessions[day][individualGroupKey].push(s);
                        });
                    }
                }

                potentialGroup.forEach(s => processedSessionKeys.add(getUniqueSessionKey(s)));
            });
        });

        return groupedSessions;
    };



    // Group the sessions
    const groupedSessions = groupAllSessions(
        schoolAvailability,
        sessions,
        teacherAvailability,
        userAvailability,
        studentsPerSession
    );

    // Create and merge events for both grouped and ungrouped sessions
    const events = createAndMergeEventsIntoRepeatingPatterns(
        groupedSessions,
        userId,
        calendars,
        schools,
        iepEndDate,
        userTimezone
    );

    return events;
};



const calculateExDATE = (schools, sessions, userTimezone) => {
    const exdates = new Set();

    sessions.forEach(session => {
        const schoolId = session.schoolYearsId;
        const sessionStart = moment.utc(session.start);

        for (const school of schools) {
            const { id, breaks } = school;

            if (id === schoolId) {
                breaks.forEach(breakTime => {
                    const breakStart = moment.tz(moment.utc(breakTime.start).format('YYYY-MM-DDTHH:mm:ss'), userTimezone).startOf('day');
                    const breakEnd = moment.tz(moment.utc(breakTime.end).format('YYYY-MM-DDTHH:mm:ss'), userTimezone).endOf('day');

                    // Get all the dates between breakStart and breakEnd
                    const currentDate = breakStart.clone();
                    while (currentDate.isSameOrBefore(breakEnd, 'day')) {
                        // Set the time of date to match the sessionStart time
                        currentDate.set({
                            hour: sessionStart.hour(),
                            minute: sessionStart.minute(),
                            second: sessionStart.second(),
                            millisecond: sessionStart.millisecond()
                        });

                        // Convert to the desired time zone and format
                        const exdate = formatExdate(currentDate, userTimezone);
                        exdates.add(exdate.getTime());

                        currentDate.add(1, 'day');
                    }
                });
            }
        }
    });

    return Array.from(exdates).map(timestamp => new Date(timestamp));
};

const createAndMergeEventsIntoRepeatingPatterns = (groupedSessions, userId, calendars, schools, iepEnd, userTimezone) => {
    const db = admin.firestore();
    const allSessions = Object.values(groupedSessions).flatMap(dateGroup => Object.values(dateGroup).flat());
    const exdatesFromBreaks = calculateExDATE(schools, allSessions, userTimezone);

    const createEvent = (group) => {
        const { sessions } = group;
        const firstSession = sessions[0];
        const sessionStartUTC = moment.utc(firstSession.start).format('YYYY-MM-DDTHH:mm:ss');
        const sessionEndUTC = moment.utc(firstSession.end).format('YYYY-MM-DDTHH:mm:ss');
        const sessionStart = moment.tz(sessionStartUTC, userTimezone).toDate();
        const sessionEnd = moment.tz(sessionEndUTC, userTimezone).toDate();
        const duration = sessionEnd - sessionStart;
        const iepLastSessionDate = moment.tz(moment.utc(iepEnd).format('YYYY-MM-DDTHH:mm:ss'), userTimezone).toDate();

        const studentIds = new Set(sessions.map(s => s.studentId));
        const studentNames = new Set(sessions.map(s => s.studentName));
        const sdiTitle = firstSession.sdi.details[0].title || 'No SDI';

        const schoolCalendar = calendars[firstSession.schoolYearsId];
        const notes = `This session is for SDI: ${sdiTitle}\nStudents: ${Array.from(studentNames).join(', ')}`;
        const studentRefs = Array.from(studentIds).map(id => db.doc(`students/${id}`));

        const frequencies = new Map();
        sessions.forEach(s => {
            if (!frequencies.has(s.sdi.period)) {
                frequencies.set(s.sdi.period, new Set());
            }
            frequencies.get(s.sdi.period).add(s.studentId);
        });

        const uniqueDays = [...new Set(sessions.map(s => moment(s.start).day()))].sort();


        // Use the new function to get repeat options and repeats value
        const { repeatOptions, repeats, missingEvents } = editRepeatingEventsBasedOnFrequency(firstSession, uniqueDays);

        return {
            allDay: false,
            author: userId,
            backgroundColor: schoolCalendar.data.color,
            calendar: schoolCalendar.ref,
            duration: {
                days: 0,
                hours: Math.floor(duration / 3600000) || 0,
                minutes: Math.floor((duration % 3600000) / 60000) || 0,
                seconds: Math.floor((duration % 60000) / 1000) || 0,
                months: 0,
                years: 0
            },
            exdate: exdatesFromBreaks,
            groupedWith: null,
            inviteeIndex: {},
            invitees: [],
            lastUpdate: 'userId',
            location: firstSession.sdi.location || 'No Location',
            myNotes: '',
            notes: notes || 'No Notes',
            owner: userId,
            repeatOptions: repeatOptions,
            repeats: repeats,
            roles: {
                any: [userId],
                editor: [],
                owner: [userId],
                viewer: []
            },
            start: sessionStart,
            end: sessionEnd,
            key: getSessionGroupKey(firstSession),
            students: studentRefs,
            title: `${Array.from(studentNames).join(', ')}: ${sdiTitle}`,
        };
    };





    const calculateMonthOccurrences = (start, end, frequency, availWeekDays) => {
        const months = differenceInMonths(end, start) + 1;

        const occurrences = [];
        const missingSessions = [];

        // First, collect all available days
        for (let i = 0; i < months; i++) {
            const currentMonthStart = startOfMonth(addMonths(start, i));
            const currentMonthEnd = min([endOfMonth(currentMonthStart), end]);

            let availableDays = [];

            if (occurrences.length >= frequency) return occurrences

            let currentDate = currentMonthStart;
            while (currentDate <= currentMonthEnd) {
                const dayAbbr = format(currentDate, 'EEE').toUpperCase().slice(0, 2);
                if (availWeekDays.includes(dayAbbr)) {
                    availableDays.push(availableDays.length);
                }
                currentDate = addDays(currentDate, 1);
            }


            // Now, evenly distribute the occurrences
            if (frequency > 0 && availableDays.length > 0) {
                const step = (availableDays.length - 1) / (frequency - 1);
                for (let i = 0; i < frequency; i++) {
                    const index = Math.min(Math.round(i * step), availableDays.length - 1);
                    occurrences.push(index + 1);
                }
            }

            // If there aren't enough available days to fulfill the frequency, mark the session as missing
            if (availableDays.length < frequency) {
                missingSessions.push({
                    month: format(currentMonthStart, 'MMM yyyy'),
                    missing: frequency - availableDays.length
                });
            }
        }

        return occurrences
    };


    const editRepeatingEventsBasedOnFrequency = (session, uniqueDays) => {
        const frequency = parseInt(session.sdi.frequency);
        const period = session.sdi.period.toLowerCase();
        const startDate = new Date(session.start);
        const endDate = new Date(iepEnd);
        const missingEvents = []

        let repeatOptions = {
            endsOnDate: endDate,
            endsType: 'onDate',
            repeatEvery: 1,
            repeatUnit: period,
            startsOnDate: startDate,
            repeatDays: [],
            occurances: [],
            repeatMonths: []
        };

        let repeats = 'custom';

        const dayMap = { 0: 'MO', 1: 'TU', 2: 'WE', 3: 'TH', 4: 'FR', 5: 'SA', 6: 'SU' };

        switch (period) {
            case 'daily':
                repeatOptions.repeatUnit = 'weekly';
                repeatOptions.repeatDays = uniqueDays.filter(day => day >= 0 && day <= 4).map(day => dayMap[day]);
                break;

            case 'weekly':
                repeatOptions.repeatUnit = 'weekly';
                repeatOptions.repeatDays = uniqueDays.map(day => dayMap[day]);
                break;

            case 'monthly':
                repeatOptions.repeatUnit = 'monthly';
                const availWeekDays = uniqueDays.map(day => dayMap[day]);
                const occurrences = calculateMonthOccurrences(startDate, endDate, frequency, availWeekDays);
                repeatOptions.repeatDays = availWeekDays;
                repeatOptions.occurances = occurrences;
                // if (missingSessions && Array.isArray(missingSessions)) {
                //     if (missingSessions.length > 0) {
                //         missingEvents.push(...missingSessions);
                //         console.warn('Not all sessions could be scheduled:', missingSessions);
                //     }
                // }
                break;

            case 'yearly':
                repeatOptions.repeatUnit = 'yearly';
                repeatOptions.repeatDays = uniqueDays.map(day => dayMap[day]);
                repeatOptions.occurances = Array.from({ length: frequency }, (_, i) => i + 1);
                // Assuming events should occur every month
                repeatOptions.repeatMonths = Array.from({ length: 12 }, (_, i) => i + 1);
                break;

            default:
                console.error('Invalid period');
                return null;
        }

        return {
            repeatOptions: repeatOptions,
            repeats: repeats,
            missingEvents: missingEvents
        };
    };




    // First, merge sessions on the same day
    // Merging sessions on the same day
    const mergeAllSameDaySessions = (groupedSessions) => {
        const mergedSameDayGroups = {};

        Object.entries(groupedSessions).forEach(([date, dateGroup]) => {
            mergedSameDayGroups[date] = {};

            Object.entries(dateGroup).forEach(([key, sessions]) => {
                const [title, duration, location, schoolYearId] = key.split('-');

                sessions.forEach(session => {
                    const mergeKey = `${title}-${duration}-${location}-${schoolYearId}`;

                    if (!mergedSameDayGroups[date][mergeKey]) {
                        mergedSameDayGroups[date][mergeKey] = [];
                    }

                    mergedSameDayGroups[date][mergeKey].push(session);
                });
            });
        });

        return mergedSameDayGroups;
    };


    // Merging across dates and preparing data for `createEvent`
    const mergeAcrossDates = (groupedSessions) => {
        const sameDayMerged = mergeAllSameDaySessions(groupedSessions);
        const mergedGroups = {};

        // First pass: group sessions across days
        Object.entries(sameDayMerged).forEach(([date, dateGroup]) => {
            Object.entries(dateGroup).forEach(([key, sessions]) => {
                const [title, duration, location, schoolYearId] = key.split('-');
                const groupedKey = sessions.map((session) => createGroupKey(session)).join('-');

                sessions.forEach(session => {
                    const timeKey = session.start.split('T')[1].split(':').slice(0, 2).join(':'); // Extract HH:MM
                    const mergeKey = createGroupKey(session);

                    // Add individual group
                    if (!mergedGroups[mergeKey]) {
                        mergedGroups[mergeKey] = { sessions: [] };
                    }
                    mergedGroups[mergeKey].sessions.push(session);

                    // Add merged group if applicable
                    if (groupedKey !== mergeKey && groupedKey.includes(mergeKey)) {
                        if (!mergedGroups[groupedKey]) {
                            mergedGroups[groupedKey] = { sessions: [] };
                        }
                        if (!mergedGroups[groupedKey].sessions.includes(session)) {
                            mergedGroups[groupedKey].sessions.push(session);
                        }
                    }
                });
            });
        });

        return Object.values(mergedGroups)
            .filter((group) => group.sessions.length > 0);
    };

    // Helper function to create a group key
    const createGroupKey = (session) => {
        const [title, duration, location, schoolYearId] = [
            session.sdi.details[0].title,
            new Date(session.end).getTime() - new Date(session.start).getTime(),
            session.sdi.location,
            session.schoolYearsId
        ];
        const timeKey = session.start.split('T')[1].split(':').slice(0, 2).join(':');
        return `${title}-${duration}-${location}-${schoolYearId}-${timeKey}-${session.sdi.period}`;
    };




    // Create events for each merged group
    const mergedGroups = mergeAcrossDates(groupedSessions);
    const events = Object.values(mergedGroups).map(sessions => createEvent(sessions));

    function processEvents(events) {
        const changedEvents = events.map(event => ({ ...event })); // Create shallow copies of all events
        const processedPairs = new Set(); // To keep track of processed event pairs

        for (let i = 0; i < changedEvents.length; i++) {
            for (let j = i + 1; j < changedEvents.length; j++) {
                const pairKey = `${i}-${j}`;
                if (!processedPairs.has(pairKey)) {
                    handleEventOverlaps(changedEvents[i], changedEvents[j]);
                    processedPairs.add(pairKey);
                }
            }
        }

        return changedEvents;
    }





    const updatedEvents = processEvents(events);
    console.log('Updated events:', updatedEvents);

    return updatedEvents;
};



function handleEventOverlaps(event1, event2) {
    if (event1.key === event2.key) {
        const dates1 = getEventDates(event1);
        const dates2 = getEventDates(event2);

        // Find overlapping dates
        const overlappingDates = dates1.filter(date1 =>
            dates2.some(date2 =>
                date1.getFullYear() === date2.getFullYear() &&
                date1.getMonth() === date2.getMonth() &&
                date1.getDate() === date2.getDate()
            )
        );

        if (overlappingDates.length > 0) {
            const periodFrequencyOrder = ['daily', 'weekly', 'monthly', 'yearly'];
            const event1FrequencyIndex = periodFrequencyOrder.indexOf(event1.repeatOptions.repeatUnit);
            const event2FrequencyIndex = periodFrequencyOrder.indexOf(event2.repeatOptions.repeatUnit);

            // Determine which event to change (the more frequent one)
            if (event1FrequencyIndex < event2FrequencyIndex) {
                addExdatesToEvent(event1, overlappingDates);
            } else if (event2FrequencyIndex < event1FrequencyIndex) {
                addExdatesToEvent(event2, overlappingDates);
            } else {
                // If frequencies are the same, add to the event with the earlier start date
                if (new Date(event1.start) <= new Date(event2.start)) {
                    addExdatesToEvent(event1, overlappingDates);
                } else {
                    addExdatesToEvent(event2, overlappingDates);
                }
            }
        }
    }
}

function addExdatesToEvent(event, dates) {
    if (!event.exdate) {
        event.exdate = [];
    }
    event.exdate = [...event.exdate, ...dates];

    // Remove duplicates from exdate array
    event.exdate = Array.from(new Set(event.exdate.map(date => date.getTime())))
        .map(time => new Date(time));
}

function getEventDates(event) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.repeatOptions.endsOnDate);
    const repeatUnit = event.repeatOptions.repeatUnit;
    const repeatDays = event.repeatOptions.repeatDays;
    const occurrences = calculateMonthOccurrencesDates(startDate, endDate, event.repeatOptions.occurances.length, repeatDays);
    const occurrenceDateOnly = occurrences.map(date => new Date(date.toISOString().split('T')[0]));
    const occurrenceDateOnlyString = occurrenceDateOnly.map(date => date.toISOString().split('T')[0]);


    const eventDates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dayOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][currentDate.getDay()];

        if (repeatUnit === 'weekly') {
            if (repeatDays.includes(dayOfWeek) && currentDate >= startDate) {
                eventDates.push(new Date(currentDate));
            }
        } else if (repeatUnit === 'monthly') {
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

            const currentDateDateOnly = new Date(currentDate.toISOString().split('T')[0]);
            const currentDateDateOnlyString = currentDateDateOnly.toISOString().split('T')[0];

            if (occurrenceDateOnlyString.includes(currentDateDateOnlyString)) {
                eventDates.push(new Date(currentDate));
            }
        }

        // Always move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return eventDates;
}




const formatExdate = (date, userTimezone) => {
    return moment.tz(moment.utc(date).format('YYYY-MM-DDTHH:mm:ss'), userTimezone).toDate();
};

const saveSessionsToDatabase = async (schedule, userId, calendars, studentsPerSession, schools) => {
    const db = admin.firestore();

    try {
        // Delete existing events in the schedules collection
        const schedulesRef = db.collection(`users/${userId}/schedules`);
        const snapshot = await schedulesRef.get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(schedulesRef.doc(doc.id));
        });
        await batch.commit();

        console.log('Existing schedules deleted');

        // Flatten the schedule array and validate events
        const allEvents = schedule.flat();
        console.log(`Total events after flattening: ${allEvents.length}`);

        const validEvents = allEvents.filter(event => {
            if (typeof event !== 'object' || event === null || Array.isArray(event)) {
                console.error('Invalid event:', event);
                return false;
            }
            return true;
        });

        if (validEvents.length !== allEvents.length) {
            console.warn(`Found ${allEvents.length - validEvents.length} invalid events. They will be skipped.`);
        }

        //Add new events
        const addPromises = validEvents.map(async (event, index) => {
            try {
                const docRef = await schedulesRef.add(event);
                console.log(`Document ${index + 1} added with ID: ${docRef.id}`);
                return docRef;
            } catch (error) {
                console.error(`Error adding document ${index + 1}:`, error);
                console.error('Problematic event:', event);
                return null;
            }
        });

        const results = await Promise.all(addPromises);
        const successfulAdds = results.filter(Boolean);

        console.log(`Successfully added ${successfulAdds.length} out of ${validEvents.length} documents`);

    } catch (error) {
        console.error('Error in saveSessionsToDatabase:', error);
    }
};

exports.generateSchedule = functions
    .runWith({
        timeoutSeconds: 540,
        memory: '2GB',
    })
    .https.onCall(async (data, context) => {
        const db = admin.firestore();
        const progressDocRef = db.collection('taskProgress').doc(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));

        try {
            if (data === null || typeof data !== 'object') {
                console.log('Received data null:', data);
                return;
            }

            const { availability, ieps, students, teachers, schools, userId, studentsPerSession, userTimezone } = data;

            if (!availability) {
                throw new Error("Availability data is missing or null.");
            }

            const unscheduledStudents = [];
            const scheduledStudents = [];

            const schoolAvailabilityData = await schoolAvailability(schools);
            await updateTheFrontEndWithProgress({ percentage: 5, message: 'School availability data loaded' }, userId, progressDocRef);

            const teacherAvailabilityData = await teacherAvailability(teachers);
            await updateTheFrontEndWithProgress({ percentage: 15, message: 'Teacher availability data loaded' }, userId, progressDocRef);

            const userAvailabilityData = await userAvailability(availability);
            await updateTheFrontEndWithProgress({ percentage: 20, message: 'User availability data loaded' }, userId, progressDocRef);

            const calendars = await createCalendarForEachSchool(schools, userId);
            await updateTheFrontEndWithProgress({ percentage: 80, message: 'Calendars created' }, userId, progressDocRef);


            const generatedSchedule = await createAndGroupSessions(
                ieps,
                schoolAvailabilityData || {},
                teacherAvailabilityData || [],
                userAvailabilityData || [],
                unscheduledStudents,
                scheduledStudents,
                userId,
                calendars,
                studentsPerSession,
                schools,
                userTimezone
            );

            await saveSessionsToDatabase(generatedSchedule, userId, calendars, studentsPerSession, schools);
            await updateTheFrontEndWithProgress({ percentage: 100, message: 'Schedule generation completed' }, userId, progressDocRef);

            await progressDocRef.delete();

            console.log('finished');
            console.log('Unscheduled students:', unscheduledStudents.length);
            console.log('Scheduled students:', scheduledStudents.length);

            return {
                success: true,
                unscheduledStudents,
                scheduledStudents
            };
        } catch (error) {
            console.error('Error in generateSchedule:', error);
            await progressDocRef.delete();
            throw new functions.https.HttpsError('internal', 'Unable to generate schedule', error);
        }
    });
