import { useState } from 'react';
import { minutes } from '../../clinic/model/validation';
import type { ClinicalService } from '../../services/model/types';
export function useAppointmentFormViewModel(services: ClinicalService[], initialTime: string) {
  const [serviceId, setServiceId] = useState('');
  const [duration, setDuration] = useState(60);
  const [time, setTime] = useState(initialTime);
  const service = services.find((s) => s.id === serviceId);
  const end = minutes(time) + duration;
  return {
    serviceId,
    service,
    duration,
    setDuration,
    time,
    setTime,
    selectService: (id: string) => {
      setServiceId(id);
      const selected = services.find((s) => s.id === id);
      if (selected) setDuration(selected.durationMinutes);
    },
    endTime:
      Number.isFinite(end) && end < 1440
        ? `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
        : 'No dia seguinte',
  };
}
