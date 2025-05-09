// ✅ src/components/StudentForm.jsx
import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

function StudentForm({ onStudentAdded }) {
  const [form, setForm] = useState({
    name: '',
    school: '',
    grade: '중1',
    teacher: '',
    schedule: {
      월: '', 화: '', 수: '', 목: '', 금: '', 토: '',
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanedSchedule = {};
    for (const day in form.schedule) {
      if (form.schedule[day]) cleanedSchedule[day] = form.schedule[day];
    }

    const { error } = await supabase.from('students').insert({
      name: form.name,
      school: form.school,
      grade: form.grade,
      teacher: form.teacher,
      schedule: JSON.stringify(cleanedSchedule), // 문자열로 저장
    });

    if (error) {
      alert('학생 추가 실패: ' + error.message);
    } else {
      alert('추가 완료!');
      onStudentAdded();
      setForm({
        name: '',
        school: '',
        grade: '중1',
        teacher: '',
        schedule: { 월: '', 화: '', 수: '', 목: '', 금: '', 토: '' },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '30px' }}>
      <h3>🧑 학생 추가</h3>
      <input placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><br />
      <input placeholder="학교" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} required /><br />
      <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
        {['중1', '중2', '중3', '고1', '고2', '고3'].map((g) => (
          <option key={g}>{g}</option>
        ))}
      </select><br />
      <input placeholder="담당 선생님" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} required /><br />
      <p>요일별 수업 시간 (예: 오전 10:00, 오후 3:30)</p>
      {Object.keys(form.schedule).map((day) => (
        <div key={day}>
          {day}:
          <input
            type="text"
            placeholder="예: 오후 3:00"
            value={form.schedule[day]}
            onChange={(e) =>
              setForm({ ...form, schedule: { ...form.schedule, [day]: e.target.value } })
            }
            style={{ marginLeft: '10px' }}
          />
        </div>
      ))}
      <button type="submit" style={{ marginTop: '10px' }}>등록</button>
    </form>
  );
}

export default StudentForm;
