import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, RequireAuth, LoginPage, RegisterPage } from '../features/auth';
import { BookingPage } from '../features/booking';
import { AppointmentsPage, AppointmentReturnPage } from '../features/appointments';
import { AdminAppointmentsPage, AdminAppointmentEventsPage } from '../features/admin';
import { DoctorAgendaPage } from '../features/agenda';
import { homePathForRole } from '../core/role-home';
import { PatientLayout } from './PatientLayout';
import { StaffLayout } from './StaffLayout';
import { DoctorLayout } from './DoctorLayout';

function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathForRole(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<RoleRedirect />} />
      </Route>

      <Route element={<RequireAuth role="patient" />}>
        <Route path="/citas/:id" element={<AppointmentReturnPage />} />

        <Route element={<PatientLayout />}>
          <Route path="/paciente" element={<BookingPage />} />
          <Route path="/paciente/citas" element={<AppointmentsPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="staff" />}>
        <Route element={<StaffLayout />}>
          <Route path="/staff" element={<AdminAppointmentsPage />} />
          <Route path="/staff/citas/:id" element={<AdminAppointmentEventsPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="doctor" />}>
        <Route element={<DoctorLayout />}>
          <Route path="/medico" element={<DoctorAgendaPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
