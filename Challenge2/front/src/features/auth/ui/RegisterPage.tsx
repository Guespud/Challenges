import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerFormSchema, type RegisterFormInput } from '../data/auth.schema';
import { authApi } from '../data/endpoints';
import { ApiError } from '../../../core/api';
import { useToast } from '../../../core/toast/ToastProvider';
import { AuthLayout } from './AuthLayout';
import { TextField } from '../../../components/ui/TextField';
import { PasswordField } from '../../../components/ui/PasswordField';
import { Button } from '../../../components/ui/Button';
import { PasswordRequirements } from './PasswordRequirements';
import content from '../../../content/es.json';

const { register: text } = content.auth;

export function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({ resolver: zodResolver(registerFormSchema), mode: 'onTouched' });

  const password = watch('password') ?? '';

  async function onSubmit(data: RegisterFormInput) {
    try {
      await authApi.register({ name: data.name, email: data.email, password: data.password });
      navigate('/login', { replace: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : text.genericError, 'error');
    }
  }

  return (
    <AuthLayout
      title={text.title}
      subtitle={text.subtitle}
      footer={
        <>
          {text.footerQuestion}{' '}
          <Link to="/login" className="font-medium text-violet-700 hover:text-violet-900">
            {text.footerCta}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <TextField label={text.nameLabel} autoComplete="name" error={errors.name?.message} {...register('name')} />

        <TextField
          label={text.emailLabel}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordField
          label={text.passwordLabel}
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordField
          label={text.confirmPasswordLabel}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <PasswordRequirements password={password} />

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? text.submitting : text.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}
