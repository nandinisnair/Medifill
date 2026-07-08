import React from 'react';
import { Platform } from 'react-native';
import DateTimePickerNative from '@react-native-community/datetimepicker';

interface DateTimePickerProps {
  value: Date;
  mode: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  onChange: (event: any, selectedDate?: Date) => void;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  mode,
  display = 'default',
  onChange,
}) => {
  const safeDate = value instanceof Date && !isNaN(value.getTime()) ? value : new Date();

  if (Platform.OS === 'web') {
    const hours = String(safeDate.getHours()).padStart(2, '0');
    const minutes = String(safeDate.getMinutes()).padStart(2, '0');
    const timeVal = `${hours}:${minutes}`;

    const yyyy = safeDate.getFullYear();
    const mm = String(safeDate.getMonth() + 1).padStart(2, '0');
    const dd = String(safeDate.getDate()).padStart(2, '0');
    const dateVal = `${yyyy}-${mm}-${dd}`;

    return (
      <input
        type={mode === 'time' ? 'time' : 'date'}
        value={mode === 'time' ? timeVal : dateVal}
        onChange={(e) => {
          const val = e.target.value;
          if (!val) return;

          if (mode === 'time') {
            const [h, m] = val.split(':').map(Number);
            if (!isNaN(h) && !isNaN(m)) {
              const updated = new Date(safeDate);
              updated.setHours(h, m, 0, 0);
              onChange({ type: 'set' }, updated);
            }
          } else {
            const [year, month, day] = val.split('-').map(Number);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
              const updated = new Date(year, month - 1, day, safeDate.getHours(), safeDate.getMinutes(), 0, 0);
              onChange({ type: 'set' }, updated);
            }
          }
        }}
        style={{
          padding: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#D1D5DB',
          fontSize: 16,
          width: '100%',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
        }}
      />
    );
  }

  // For native platforms, use the native date picker
  return (
    <DateTimePickerNative
      value={safeDate}
      mode={mode}
      display={display}
      onChange={onChange}
    />
  );
};

export default DateTimePicker;
