import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '../data/auth.schema';
import { useAuth } from '../shared/auth-context';
import { ApiError } from '../../../core/api';
import { AuthLayout } from './AuthLayout';
import { TextField } from '../../../components/ui/TextField';
import { PasswordField } from '../../../components/ui/PasswordField';
import { Button } from '../../../components/ui/Button';
import content from '../../../content/es.json';

const { login: text } = content.auth;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setFormError(null);
    try {
      await login(data);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : text.genericError);
    }
  }

  return (
    <AuthLayout
      title={text.title}
      subtitle={text.subtitle}
      footer={
        <>
          {text.footerQuestion}{' '}
          <Link to="/registro" className="font-medium text-blue-700 hover:text-blue-900">
            {text.footerCta}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <TextField
          label={text.emailLabel}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <PasswordField
          label={text.passwordLabel}
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        {formError && <p className="text-sm text-neutral-900 font-semibold">{formError}</p>}

        <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
          {isSubmitting ? text.submitting : text.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}
