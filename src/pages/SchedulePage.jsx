import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { supabase } from '../utils/supabaseClient';
import LessonTable from '../components/LessonTable';

function SchedulePage() {
  const { week } = useParams(); // YYYY-MM-DD format
  const [lessons, setLessons] = useState([]);
  const [studentsMap, setStudentsMap] = useState({});
  const [studentNameInput, setStudentNameInput] = useState('');
  const [makeupDate, setMakeupDate] = useState('');
  const [makeupTime, setMakeupTime] = useState('');

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .is('deleted_at', null);
    if (!error) {
      const map = {};
      data.forEach((s) => (map[s.id] = s));
      setStudentsMap(map);
    }
  };

  const fetchLessons = async () => {
    const start = dayjs(week).format('YYYY-MM-DD');
    const end = dayjs(week).add(6, 'day').format('YYYY-MM-DD');
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .gte('date', start)
      .lte('date', end);
    if (!error) {
      setLessons(
        data.sort((a, b) =>
          a.date === b.date
            ? a.time.localeCompare(b.time)
            : a.date.localeCompare(b.date)
        )
      );
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchLessons();
    const channel = supabase
      .channel('lesson-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, () => fetchLessons())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [week]);

  const handleAddMakeup = async () => {
    if (!studentNameInput || !makeupDate || !makeupTime) {
      alert('학생 이름, 날짜, 시간을 모두 입력해주세요');
      return;
    }
    // Find student by name
    const studentEntry = Object.values(studentsMap).find(
      (s) => s.name === studentNameInput
    );
    if (!studentEntry) {
      alert('해당 이름의 학생이 없습니다');
      return;
    }

    await supabase.from('lessons').insert({
      student_id: studentEntry.id,
      date: makeupDate,
      time: makeupTime,
      student_name: studentEntry.name,
      student_school: studentEntry.school,
      student_grade: studentEntry.grade,
      student_teacher: studentEntry.teacher,
      status: '보강추가',
    });

    // Reset form
    setStudentNameInput('');
    setMakeupDate('');
    setMakeupTime('');
    fetchLessons();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>{week} 주 수업리스트</h2>
      <button onClick={fetchLessons} style={{ marginBottom: 10 }}>
        수업리스트 새로고침
      </button>

      <LessonTable lessons={lessons} studentsMap={studentsMap} onUpdate={fetchLessons} />

      <div style={{ border: '1px solid #ccc', padding: 20, marginTop: 20 }}>
        <h3>보강수업 추가</h3>
        <div style={{ marginBottom: 10 }}>
          <label>
            학생 이름:{' '}
            <input
              type="text"
              placeholder="학생 이름 입력"
              value={studentNameInput}
              onChange={(e) => setStudentNameInput(e.target.value)}
            />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>
            날짜:{' '}
            <input
              type="date"
              value={makeupDate}
              onChange={(e) => setMakeupDate(e.target.value)}
            />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>
            시간:{' '}
            <input
              type="text"
              placeholder="HH:mm"
              value={makeupTime}
              onChange={(e) => setMakeupTime(e.target.value)}
            />
          </label>
        </div>
        <button onClick={handleAddMakeup}>보강수업 추가</button>
      </div>
    </div>
  );
}

export default SchedulePage;
