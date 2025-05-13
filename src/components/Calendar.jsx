import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

function Calendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  const startOfMonth = currentMonth.startOf('month').startOf('week');
  const endOfMonth = currentMonth.endOf('month').endOf('week');

  const days = [];
  let day = startOfMonth;
  while (day.isBefore(endOfMonth, 'day')) {
    days.push(day);
    day = day.add(1, 'day');
  }

  const handleClick = (date) => {
    const weekStart = date.startOf('week').format('YYYY-MM-DD');
    navigate(`/schedule/${weekStart}`);
  };

  const prevMonth = () => {
    setCurrentMonth((prev) => prev.subtract(1, 'month'));
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => prev.add(1, 'month'));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={prevMonth}>이전</button>
        <h3>{currentMonth.format('YYYY년 M월')}</h3>
        <button onClick={nextMonth}>다음</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} style={{ fontWeight: 'bold', textAlign: 'center' }}>{d}</div>
        ))}
        {days.map((d, idx) => (
          <div
            key={idx}
            onClick={() => handleClick(d)}
            style={{
              padding: 10,
              textAlign: 'center',
              background: d.isSame(dayjs(), 'date') ? '#d0ebff' : '#f1f3f5',
              cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            {d.format('D')}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Calendar;
