import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, RequireAuth, LoginPage, RegisterPage } from '../features/auth';
import { PatientDashboardPage } from '../features/habits';
import { NutritionistPatientsPage, NutritionistPatientDetailPage } from '../features/patients';
import { AppLayout } from '../components/layout/AppLayout';

function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'nutritionist' ? '/nutriologa' : '/paciente'} replace />;
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
        <Route element={<AppLayout />}>
          <Route path="/paciente" element={<PatientDashboardPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="nutritionist" />}>
        <Route element={<AppLayout />}>
          <Route path="/nutriologa" element={<NutritionistPatientsPage />} />
          <Route path="/nutriologa/pacientes/:id" element={<NutritionistPatientDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
