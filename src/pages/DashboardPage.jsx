import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import AddStudentModal from '../components/AddStudentModal';
import EditStudentModal from '../components/EditStudentModal';
import Calendar from '../components/Calendar';

function DashboardPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [editStudent, setEditStudent] = useState(null);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .is('deleted_at', null)
      .order('id');
    if (!error) setStudents(data);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDelete = async (student) => {
    const date = prompt('퇴원일을 YYYY-MM-DD 형식으로 입력하세요');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      alert('날짜 형식이 올바르지 않습니다');
      return;
    }
    if (!window.confirm(`${student.name} 학생을 ${date}부터 퇴원 처리할까요?`))
      return;
    await supabase
      .from('students')
      .update({ deleted_at: date })
      .eq('id', student.id);
    await supabase
      .from('lessons')
      .delete()
      .gte('date', date)
      .eq('student_id', student.id);
    fetchStudents();
  };

  const filtered = students.filter((s) =>
    `${s.name}${s.school}${s.grade}${s.teacher}`.includes(search)
  );

  return (
    <div style={{ padding: 20 }}>
      {/* 1️⃣ 달력 먼저 */}
      <h2>📅 달력</h2>
      <Calendar />

      {/* 2️⃣ 학생 검색 & 목록 */}
      <h2>학생 목록</h2>
      <input
        placeholder="검색: 이름/학교/학년/선생님"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <AddStudentModal onAdd={fetchStudents} />
      <table
        border="1"
        cellPadding="6"
        style={{ width: '100%', marginBottom: 30 }}
      >
        <thead>
          <tr>
            <th>번호</th>
            <th>이름</th>
            <th>학교</th>
            <th>학년</th>
            <th>담당</th>
            <th>수업시간</th>
            <th>수정</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s, i) => (
            <tr key={s.id}>
              <td>{i + 1}</td>
              <td>{s.name}</td>
              <td>{s.school}</td>
              <td>{s.grade}</td>
              <td>{s.teacher}</td>
              <td>{s.schedule}</td>
              <td>
                <button onClick={() => setEditStudent(s)}>수정</button>
              </td>
              <td>
                <button onClick={() => handleDelete(s)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editStudent && (
        <EditStudentModal
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onUpdate={fetchStudents}
        />
      )}
    </div>
);

}  // <-- 함수 닫는 중괄호 위치!

export default DashboardPage;
