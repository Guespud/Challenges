import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { habitFormSchema, type HabitFormInput } from '../data/habit.schema';
import { habitApi } from '../data/endpoints';
import { today } from '../data/today';
import { ApiError } from '../../../core/api';
import { TextField } from '../../../components/ui/TextField';
import { Button } from '../../../components/ui/Button';
import content from '../../../content/es.json';

const { form: text } = content.habits;

export function HabitForm({ onSaved }: { readonly onSaved: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HabitFormInput>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: { water_ml: 2000, exercise_min: 30, sleep_hours: 8 },
  });

  async function onSubmit(data: HabitFormInput) {
    setError(null);
    try {
      await habitApi.upsert({ date: today(), ...data });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : text.genericError);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] sm:p-8"
    >
      <h2 className="text-lg font-bold tracking-tight text-neutral-900">{text.title}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField
          label={text.waterLabel}
          type="number"
          min={0}
          max={10000}
          error={errors.water_ml?.message}
          {...register('water_ml', { valueAsNumber: true })}
        />

        <TextField
          label={text.exerciseLabel}
          type="number"
          min={0}
          max={1440}
          error={errors.exercise_min?.message}
          {...register('exercise_min', { valueAsNumber: true })}
        />

        <TextField
          label={text.sleepLabel}
          type="number"
          min={0}
          max={24}
          step={0.5}
          error={errors.sleep_hours?.message}
          {...register('sleep_hours', { valueAsNumber: true })}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-fit sm:self-end">
        {isSubmitting ? text.submitting : text.submit}
      </Button>
    </form>
  );
}
