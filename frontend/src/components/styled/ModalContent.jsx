import styled from '@mui/material/styles/styled';
import Paper from '@mui/material/Paper';

const ModalContent = styled(Paper)(({ theme }) => ({
    fontFamily: 'IBM Plex Sans, sans-serif',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: theme.palette.background.paper,
    borderRadius: '20px',
    boxShadow: theme.shadows[5],
    padding: '24px',
    width: '600px',
    maxWidth: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
}));
export default ModalContent;
