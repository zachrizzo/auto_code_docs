import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepConnector
} from '@mui/material';
import { styled } from '@mui/material/styles';
import Check from '@mui/icons-material/Check';
import ErrorCircle from '@material-symbols/svg-400/outlined/error.svg';
import FrameInspectIcon from '@material-symbols/svg-400/outlined/frame_inspect.svg';
import {
  getFirestore,
  doc,
  onSnapshot,
  collectionGroup,
  query,
  where,
  orderBy,
  collection,
  addDoc,
  writeBatch

} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Layout from 'components/app/layouts/main';
import Step1 from 'components/app/scheduler/steps/Step1';
import Step2 from 'components/app/scheduler/steps/Step2';
import Step3 from 'components/app/scheduler/steps/Step3';
import Step4 from 'components/app/scheduler/steps/Step4';
import Step5 from 'components/app/scheduler/steps/Step5';
import Verification from 'components/app/scheduler/Verification';
import ErrorIndicator from 'components/app/utils/ErrorIndicator';
import { SchoolYearContext } from 'contexts/schoolYears';
import { SchedulerContext, SchedulerContextProvider, steps } from 'contexts/scheduler';
import { SchoolContextProvider, SchoolContext } from 'contexts/schools';
import { TeacherContext, TeacherContextProvider } from 'contexts/teachers';
import { StudentContextProvider, StudentContext } from 'contexts/students';
import { UsersContextProvider } from 'contexts/users';
import { useTeam } from 'contexts/teams';
import { scheduleConverter } from 'lib/data/schedule';
import { iepConverter } from 'lib/data/student';
import { isAfter, isBefore } from 'date-fns';
import { useRouter } from 'next/router';
import { eventConverter } from 'lib/data/event';
import { RRule, RRuleSet } from 'rrule';


const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
    left: 'calc(-50% + 7px)',
    right: 'calc(50% + 7px)',
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: '#017971',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: '#017971',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: '#eaeaf0',
    borderRadius: 1,
  },
}));

const ColorlibStepIconRoot = styled('div')(({ theme, ownerState }) => ({
  backgroundColor: '#EEEEEE',
  zIndex: 1,
  color: '#777777',
  fill: '#777777',
  width: 40,
  height: 40,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  ...(ownerState.active && {
    backgroundColor: '#EEEEEE',
    color: '#333',
    fill: '#333',
  }),
  ...(ownerState.completed && {
    backgroundColor: ownerState.active ? '#017971' : '#80bcb8',
    color: '#fff',
  }),
}));

const ColorlibStepIcon = ({ active, className, completedState, validatedState, label, icon }) => {
  const index = steps.findIndex((step) => step === label);
  const isCompleted = !!completedState[index] && !!validatedState[index];
  const icons = {
    1: <FrameInspectIcon />,
    2: <FrameInspectIcon />,
    3: <FrameInspectIcon />,
    4: <FrameInspectIcon />,
    5: <FrameInspectIcon />,
  };

  if (!validatedState[index] && completedState[index]) {
    return (
      <ColorlibStepIconRoot ownerState={{ completed: isCompleted, active }} className={className}>
        <ErrorCircle />
      </ColorlibStepIconRoot>
    );
  }

  return (
    <ColorlibStepIconRoot ownerState={{ completed: isCompleted, active }} className={className}>
      {isCompleted ? <Check className='QontoStepIcon-completedIcon' /> : icons[String(icon)]}
    </ColorlibStepIconRoot>
  );
};

const ModifyScheduling = () => {
  const db = getFirestore();
  const { activeYear } = useContext(SchoolYearContext);
  const { user, activeTeam } = useTeam();
  const {
    schedule,
    setSchedule,
    validated,
    setValidated,
    activeStep,
    setActiveStep,
    completed,
    setCompleted,
    setValidateCurrentStep,
    status,
    setStatus,
    schedulerData,
    setSchedulerData,
  } = useContext(SchedulerContext);
  const [studentsPerSession, setStudentsPerSession] = useState({ min: 2, max: 4 });
  const { students, years: studentSchoolYears, getSchoolYear } = useContext(StudentContext);
  const { getTeacher, teachers, years: teacherYears } = useContext(TeacherContext);
  const { getSchool, schools, years: schoolYears } = useContext(SchoolContext);
  const [error, setError] = useState(null);
  const [studentIEPs, setStudentIEPs] = useState([]);
  const [iepData, setIepData] = useState([]);
  const [unscheduledStudents, setUnscheduledStudents] = useState([]);
  const [scheduledStudents, setScheduledStudents] = useState([]);
  const availabilities = user.availability || [];
  const functions = getFunctions();
  const [loading, setLoading] = useState(false);
  const [modifiedStudents, setModifiedStudents] = useState([]);
  const router = useRouter();
  const [progress, setProgress] = useState({ percentage: 0, message: '' });
  const [generatedSchedule, setGeneratedSchedule] = useState([]);
  const [timeZone, setTimeZone] = useState('');


  const isNextStepDisabled = !validated[activeStep];

  const generateSchedule = async () => {
    setLoading(true);
    try {
      const {
        availability = [],
        ieps = [],
        students = [],
        teachers = [],
        schools = []
      } = schedulerData || {};

      console.log('schedulerData:', schedulerData);



      const simplifiedAvailability = availability.map(item => ({
        id: item.id,
        schoolYearsId: schools.find(school => school.ref.path.includes(item.school?.id))?.ref.id,
        schoolName: item.school?.name,
        days: item.days,
        timeSlots: [{ start: item.morningStart, end: item.morningEnd }, { start: item.afternoonStart, end: item.afternoonEnd }],
      }));

      const simplifiedIeps = ieps.map(item => ({
        id: item.id,
        yearId: item.yearId,
        studentName: item.studentName,
        schoolName: item.school,
        duration: item.duration,
        durationType: item.durationType,
        frequency: item.frequency,
        iepID: item.iepID,
        location: item.location,
        iepStart: item.start,
        iepEnd: item.end,
        period: item.period,
        school: item.school,
        SDIs: item.SDIs,
        studentName: item.studentName,
        schoolYearsId: schools.find(school => school.ref.path.includes(item.schoolId))?.ref.id,
        schoolId: item.schoolId,
        studentId: item.ref.path.split('/')[1],
      }));

      const simplifiedStudents = students.map(item => ({
        id: item.id,
        name: item.name,
        iepId: item.iep,
      }));

      const simplifiedTeachers = teachers.map(item => ({
        id: item.id,
        name: item.name,
        email: item.email,
        schoolId: item.school.id,
        schoolYearsId: schools.find(school => school.ref.path.includes(item.school.id))?.ref.id,
        subject: item.subject,
        grades: item.grades,
        preferredTimes: item.preferredTimes?.map(pt => ({
          days: pt.days,
          start: pt.start,
          end: pt.end,
        })),
        obstacles: item.obstacles?.map(ob => ({
          days: ob.days,
          start: ob.start,
          end: ob.end,
        })),
      }));

      const simplifiedSchools = schools.map(item => ({
        breaks: item.breaks.map(b => ({
          start: b.start,
          end: b.end,
          name: b.name,
          id: b.id,
        })),
        id: item.id,
        name: item.name,
        endTime: item.endTime,
        startTime: item.startTime,
        end: item.end,
        start: item.start,
        path: item.path,
      }));

      console.log('Simplified simplifiedSchools:', simplifiedTeachers, simplifiedIeps);

      const generateScheduleFunction = httpsCallable(functions, 'schedule-generateSchedule', { timeout: 540000 });
      const response = await generateScheduleFunction({
        availability: simplifiedAvailability,
        ieps: simplifiedIeps,
        students: simplifiedStudents,
        teachers: simplifiedTeachers,
        schools: simplifiedSchools,
        userId: user.id,
        studentsPerSession: studentsPerSession,
        userTimezone: timeZone,
      });

      console.log('Schedule generated successfully', response.data);
      if (response.data.success) {
        setStatus('SCHEDULED');
      }
      setUnscheduledStudents(response.data.unscheduledStudents);
      setScheduledStudents(response.data.scheduledStudents);
      setLoading(false);
    } catch (error) {
      console.error('Error generating schedule:', error);
      setError(error);
      setStatus('PRECHECK');
      setLoading(false);
    }
  };

  const handleNext = useCallback(() => {
    if (validated[activeStep]) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  }, [activeStep, validated, setActiveStep]);

  const handleBack = useCallback(() => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  }, [setActiveStep]);




  const saveGeneratedEventsToCalender = async () => {
    if (!generatedSchedule.length) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      generatedSchedule.forEach(event => {
        const eventRef = doc(collection(db, 'events').withConverter(eventConverter));
        batch.set(eventRef, event);
      });
      await batch.commit();
      setStatus('SCHEDULED');
      setLoading(false);
      router.push('/app/calendar');
      return;
    } catch (error) {
      console.error('Error saving events to calendar:', error);
      setError(error);
      setLoading(false);
      return;
    }
  };

  const handleComplete = useCallback(async () => {
    if (activeStep === 4) {
      return await saveGeneratedEventsToCalender();
    }
    setCompleted((prevCompleted) => ({
      ...prevCompleted,
      [activeStep]: true,
    }));
    handleNext();
  }, [activeStep, handleNext, setCompleted, saveGeneratedEventsToCalender, generatedSchedule]);

  const onCancel = useCallback(() => {
    setActiveStep(0);
    setStatus('CHECKED');
    setSchedule({});
    setCompleted({});
    setStatus('PRECHECK');
    setError(null);
  }, [setActiveStep, setStatus, setSchedule, setCompleted, setError]);








  const renderSteps = useCallback(() => {
    switch (activeStep) {
      case 0:
        return (
          <Step1
            user={user}
            availabilities={availabilities}
            setValidated={setValidated}
            activeStep={activeStep}
            schedulerData={schedulerData}
            setSchedulerData={setSchedulerData}
          />
        );
      case 1:
        return (
          <Step2
            studentIEPs={studentIEPs}
            iepData={iepData}
            loading={loading}
          />
        );
      case 2:
        return (
          <Step3
            modifiedStudents={modifiedStudents}
            loading={loading}
            studentIEPs={studentIEPs}
          />
        );
      case 3:
        return (
          <Step4
            studentsPerSession={studentsPerSession}
            setStudentsPerSession={setStudentsPerSession}
          />
        );
      case 4:
        return <Step5 unscheduledStudents={unscheduledStudents} scheduledStudents={scheduledStudents} schedule={generatedSchedule.map((event) => {
          return eventConverter.toFullCalendar(event, []);
        })} />;
      default:
        return <Step1 />;
    }
  }, [activeStep, availabilities, schedulerData, setSchedulerData, setValidated, user, studentIEPs, iepData, loading, modifiedStudents, studentsPerSession]);


  useEffect(() => {
    console.log('Active step:', activeStep);
    console.log('Status:', status);
    if (activeStep === 4 && status === 'VERIFIED' && !loading) {
      console.log('Generating schedule');
      setStatus('GENERATING');
      generateSchedule();
    }
  }, [activeStep, status, loading]);

  useEffect(() => {
    if (!user?.id || !db) return;



    const q = query(collection(db, 'users', user.id, 'schedules').withConverter(eventConverter));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tempSchedule = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tempSchedule.push(data);
      });
      setGeneratedSchedule(tempSchedule);
    });

    return () => unsubscribe();
  }, [user?.id, db]);




  useEffect(() => {
    if (!user.id) return;
    const q = query(
      collection(db, 'taskProgress'),
      where('owner', '==', user.id),
      where('type', '==', 'schedule')
    );
    onSnapshot(q, (querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        setProgress({
          percentage: data.percentage,
          message: data.updateMessage
        });
      });
    });
  }, [user.id]);

  // Fetch IEP data
  useEffect(() => {
    if (!activeYear?.ref || !activeTeam.id) return;
    const q = query(
      collectionGroup(db, 'ieps'),
      where('owner', '==', activeTeam.id),
      where('schoolYears', 'array-contains', activeYear.ref),
      orderBy('end', 'desc')
    ).withConverter(iepConverter);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const rows = [];
      querySnapshot.forEach((doc) => {
        rows.push(doc.data());
      });
      setStudentIEPs(rows);
    });
    return () => unsubscribe();
  }, [activeYear?.ref, activeTeam.id, db]);

  // Update IEP data
  useEffect(() => {
    if (!students.length || !studentSchoolYears.length || !schools.length || !studentIEPs.length || !getSchoolYear || !getSchool) return;
    const rows = [];
    students.forEach((student) => {
      const year = getSchoolYear(student?.ref);
      const school = getSchool(year?.school);
      const currentDate = new Date();
      const filtered = studentIEPs.filter((iep) => {
        const iepEndDate = new Date(iep.end);
        return iep.ref.path.includes(`students/${student.id}`) && isAfter(iepEndDate, currentDate);
      });
      const iep = filtered.reduce((a, b) => {
        const aEndDate = new Date(a.end);
        const bEndDate = new Date(b.end);
        return isAfter(aEndDate, bEndDate) ? a : b;
      }, {});
      rows.push({
        ref: iep?.ref,
        id: student?.id,
        yearId: year?.id,
        studentName: `${student?.firstName} ${student?.lastName}`,
        school: school?.name,
        schoolId: school?.id,
        frequency: iep?.frequency,
        period: iep?.period,
        location: iep?.location,
        duration: iep?.duration,
        durationType: iep?.durationType,
        iepID: iep?.id,
        SDIs: iep?.SDIs,
        start: iep?.start,
        end: iep?.end,
      });
    });
    setIepData(rows);
    setSchedulerData((prevData) => ({
      ...prevData,
      ieps: rows,
    }));
  }, [students, studentSchoolYears, schools, studentIEPs, getSchoolYear, getSchool, setSchedulerData]);

  // Update student data
  useEffect(() => {
    if (!students || !studentSchoolYears || !schools || !teachers || !studentIEPs) return;
    const rows = [];
    students.forEach((student) => {
      const year = getSchoolYear(student?.ref);
      const filtered = studentIEPs.filter((iep) => iep.ref.path.includes(`students/${student.id}`) && isBefore(iep.start, new Date()));
      const iep = filtered.reduce((a, b) => (isAfter(a.end, b.end) ? a : b), {});
      rows.push({
        id: student.id,
        year: year?.id,
        name: `${student?.firstName} ${student?.lastName}`,
        school: year?.school,
        grade: year?.grade,
        teacher: year?.teacher,
        iep: iep?.id,
        SDIs: iep?.SDIs,
      });
    });
    setModifiedStudents(rows);
  }, [students, studentSchoolYears, schools, teachers, studentIEPs]);

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(timeZone);
  }, []);

  // Generate schedule
  useEffect(() => {
    if (availabilities.length === 0 && iepData.length === 0 && studentIEPs.length === 0 && modifiedStudents.length === 0 && loading && status === 'PRECHECK' && activeStep === 0) return;
    setSchedulerData({ ...schedulerData, students: modifiedStudents, teachers: teacherYears, schools: schoolYears, availability: availabilities, ieps: iepData });
  }, [status, availabilities, iepData, studentIEPs]);


  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', marginTop: '20px' }}>
        <CircularProgress size={60} />
        {/* display the progress */}
        <Typography>{progress.message}</Typography>
        <Typography>{progress.percentage}%</Typography>
      </Box>
    );
  } else {
    return (
      <>
        <Box sx={{ height: '98vh', display: 'flex', flexDirection: 'column', justifyContent: 'start', padding: '16px' }}>
          <Box sx={{ flex: '1 0 auto', overflowY: 'auto', paddingBottom: '16px' }}>
            <Typography variant='h2'>Create Caseload Schedule {`${activeYear?.start} - ${activeYear?.end}`}</Typography>
            <Divider sx={{ width: '100%', marginTop: '15px', marginBottom: '25px' }} />
            {renderSteps()}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', padding: '10px', width: '100%', justifyContent: 'end', flexShrink: 0 }}>
            {activeStep !== 0 && (
              <Button variant='outlined' disabled={activeStep === 0} onClick={handleBack} sx={{ mr: '10px', flex: '1 1 auto', maxWidth: '100px' }}>
                Back
              </Button>
            )}
            <Button
              sx={{ flex: '2 1 auto', maxWidth: '225px' }}
              variant='contained'
              disabled={isNextStepDisabled || loading || (activeStep === 4 && generatedSchedule.length === 0)}
              onClick={handleComplete}
            >
              {activeStep === 4 ? 'Accept & Finish' : 'Continue'}
            </Button>
          </Box>
        </Box>
        {status === 'PRECHECK' && <Verification availabilities={availabilities} iepData={iepData} studentIEPs={studentIEPs} loading={loading} />}
        {(status === 'GENERATING' || status === 'SCHEDULING') && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', marginTop: '20px' }}>
            <CircularProgress size={60} />
            <Typography>{status === 'GENERATING' ? 'Compiling...' : 'Adding...'}</Typography>
          </Box>
        )}
        {status === 'SCHEDULED' && (
          <Box sx={{ textAlign: 'center', marginTop: '20px' }}>
            <Typography>Kit scheduled your caseload!</Typography>
            <Button sx={{ width: '168px', height: '42px', backgroundColor: '#ffffff', color: '#333333', borderRadius: '3px', boxShadow: '0px -2px 0px rgba(0,0,0, 0.15) inset', '&:hover': { backgroundColor: '#ffffff' } }} onClick={onCancel}>
              Go to Calendar
            </Button>
          </Box>
        )}
        <ErrorIndicator error={error} />
      </>
    );
  };
};

const Page = (props) => (
  <SchoolContextProvider>
    <TeacherContextProvider>
      <StudentContextProvider>
        <SchedulerContextProvider>
          <UsersContextProvider>
            <ModifyScheduling {...props} />
          </UsersContextProvider>
        </SchedulerContextProvider>
      </StudentContextProvider>
    </TeacherContextProvider>
  </SchoolContextProvider>
);

Page.getLayout = function getLayout(page) {
  return <Layout>{page}</Layout>;
};

export default Page;
