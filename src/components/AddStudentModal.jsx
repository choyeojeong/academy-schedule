import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import dayjs from 'dayjs';

const days = ['월', '화', '수', '목', '금', '토'];

function AddStudentModal({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [teacher, setTeacher] = useState('');
  const [startDate, setStartDate] = useState('');
  const [times, setTimes] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const schedule = days
      .map((day) => (times[day] ? `${day} ${times[day]}` : null))
      .filter(Boolean)
      .join(', ');

    // 1) 학생 등록
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        name,
        school,
        grade,
        teacher,
        start_date: startDate,
        schedule,
      })
      .select()
      .single();

    if (studentError) {
      alert('학생 추가 실패');
      return;
    }

    // 2) 대량 수업 레슨 데이터 준비 (7년치)
    const weeks = 52 * 7;
    const lessonsData = [];
    for (let i = 0; i < weeks * 7; i++) {
      const dateObj = dayjs(startDate).add(i, 'day');
      const weekdayKor = ['일', '월', '화', '수', '목', '금', '토'][dateObj.day()];
      const time = times[weekdayKor];
      if (time) {
        lessonsData.push({
          student_id: student.id,
          date: dateObj.format('YYYY-MM-DD'),
          time,
          student_name: student.name,
          student_school: student.school,
          student_grade: student.grade,
          student_teacher: student.teacher,
        });
      }
    }

    // 3) 배치 삽입
    const { error: lessonsError } = await supabase
      .from('lessons')
      .insert(lessonsData);

    if (lessonsError) {
      console.error('레슨 생성 오류:', lessonsError);
      alert('수업 레슨 생성 중 오류가 발생했습니다');
      return;
    }

    // 완료 및 닫기
    setOpen(false);
    onAdd();
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen(true)}>+ 학생 추가</button>
      {open && (
        <div style={{ border: '1px solid #ccc', padding: 20, marginTop: 10 }}>
          <h3>학생 추가</h3>
          <form onSubmit={handleSubmit}>
            <input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="학교" value={school} onChange={(e) => setSchool(e.target.value)} />
            <input placeholder="학년" value={grade} onChange={(e) => setGrade(e.target.value)} />
            <input placeholder="담당선생님" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <div style={{ marginTop: 10 }}>
              {days.map((day) => (
                <div key={day}>
                  {day}{' '}
                  <input
                    type="text"
                    placeholder="예: 16:00"
                    value={times[day] || ''}
                    onChange={(e) => setTimes((prev) => ({ ...prev, [day]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <button type="submit">저장</button>{' '}
            <button type="button" onClick={() => setOpen(false)}>
              취소
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default AddStudentModal;
