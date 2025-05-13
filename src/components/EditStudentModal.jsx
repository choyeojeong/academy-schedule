import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import dayjs from 'dayjs';

const days = ['월', '화', '수', '목', '금', '토'];

function EditStudentModal({ student, onClose, onUpdate }) {
  const [name, setName] = useState(student.name);
  const [school, setSchool] = useState(student.school);
  const [grade, setGrade] = useState(student.grade);
  const [teacher, setTeacher] = useState(student.teacher);
  const [times, setTimes] = useState({});

  useEffect(() => {
    // 기존 스케줄 파싱
    const parsed = {};
    if (student.schedule) {
      student.schedule.split(',').forEach((s) => {
        const [day, time] = s.trim().split(' ');
        parsed[day] = time;
      });
    }
    setTimes(parsed);
  }, [student]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    // 새 스케줄 문자열
    const newSchedule = days
      .map((d) => (times[d] ? `${d} ${times[d]}` : null))
      .filter(Boolean)
      .join(', ');

    // 1) 학생 정보 업데이트
    const { error: studErr, data: updatedStudent } = await supabase
      .from('students')
      .update({ name, school, grade, teacher, schedule: newSchedule })
      .eq('id', student.id)
      .select()
      .single();
    if (studErr) {
      alert('학생 정보 수정 중 오류가 발생했습니다');
      return;
    }

    // 2) 미래 수업 리스트 재생성
    const today = dayjs().format('YYYY-MM-DD');
    // 기존 미래 레슨 삭제
    await supabase
      .from('lessons')
      .delete()
      .eq('student_id', student.id)
      .gte('date', today);

    const weeks = 26; // 향후 6개월
    for (let i = 0; i < weeks * 7; i++) {
      const dateObj = dayjs(today).add(i, 'day');
      const weekdayKor = ['일', '월', '화', '수', '목', '금', '토'][dateObj.day()];
      const newTime = times[weekdayKor];
      if (newTime) {
        await supabase.from('lessons').insert({
          student_id: updatedStudent.id,
          date: dateObj.format('YYYY-MM-DD'),
          time: newTime,
          student_name: updatedStudent.name,
          student_school: updatedStudent.school,
          student_grade: updatedStudent.grade,
          student_teacher: updatedStudent.teacher,
        });
      }
    }

    onUpdate();
    onClose();
  };

  return (
    <div style={{ border: '1px solid gray', padding: 20, marginTop: 10 }}>
      <h3>학생 정보 수정</h3>
      <form onSubmit={handleUpdate}>
        <div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
          />
        </div>
        <div>
          <input
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="학교"
          />
        </div>
        <div>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="학년"
          />
        </div>
        <div>
          <input
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            placeholder="담당선생님"
          />
        </div>
        <div style={{ marginTop: 10 }}>
          {days.map((day) => (
            <div key={day}>
              {day}{' '}
              <input
                type="text"
                placeholder="예: 16:00"
                value={times[day] || ''}
                onChange={(e) =>
                  setTimes((prev) => ({ ...prev, [day]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="submit">저장</button>{' '}
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditStudentModal;