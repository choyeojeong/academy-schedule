// src/components/StudentDashboard.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import LessonTable from './LessonTable';

function StudentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [studentsMap, setStudentsMap] = useState({});

  // 학생 정보 불러오기
  useEffect(() => {
    const fetchStudent = async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();
      if (!error) setStudent(data);
    };
    fetchStudent();
  }, [id]);

  // 해당 학생의 전체 수업 내역 불러오기
  useEffect(() => {
    if (!student) return;
    const fetchLessons = async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', id)
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (!error) setLessons(data);
    };
    fetchLessons();
  }, [student, id]);

  // LessonTable용 map 세팅
  useEffect(() => {
    if (student) {
      setStudentsMap({ [student.id]: student });
    }
  }, [student]);

  if (!student) return <div>로딩 중...</div>;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)}>← 뒤로가기</button>
      <h2>{student.name} 학생 정보</h2>
      <p>학교: {student.school}</p>
      <p>학년: {student.grade}</p>
      <p>담당 선생님: {student.teacher}</p>
      <p>수업 스케줄: {student.schedule}</p>

      <h3>전체 수업 내역</h3>
      <LessonTable
        lessons={lessons}
        studentsMap={studentsMap}
        onUpdate={() => {
          /* StudentDashboard 에서는 onUpdate 필요 시 페이지 새로고침으로 처리 */
        }}
      />
    </div>
  );
}

export default StudentDashboard;
