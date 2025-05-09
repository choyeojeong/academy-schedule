// ✅ src/components/MakeupForm.jsx
import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

function MakeupForm({ students, refreshLessons }) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleMakeup = async () => {
    if (!selectedStudent || !date || !time) return alert('모든 항목을 입력해주세요.');

    const { error } = await supabase.from('lessons').insert({
      date,
      student_id: selectedStudent,
      start_time: time,
      status: '보강',
      is_makeup: true,
    });

    if (error) alert('보강 등록 실패: ' + error.message);
    else {
      alert('보강 수업 등록 완료!');
      setSelectedStudent('');
      setDate('');
      setTime('');
      refreshLessons();
    }
  };

  return (
    <div style={{ marginTop: '30px', border: '1px solid #ccc', padding: '20px' }}>
      <h3>➕ 보강 수업 등록</h3>
      <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
        <option value="">학생 선택</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
        ))}
      </select>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input type="text" placeholder="시간 (예: 오후 3:00)" value={time} onChange={(e) => setTime(e.target.value)} />
      <button onClick={handleMakeup}>등록</button>
    </div>
  );
}

export default MakeupForm;
