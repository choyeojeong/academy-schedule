// ✅ src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import StudentForm from '../components/StudentForm';
import LessonList from '../components/LessonList';
import MakeupForm from '../components/MakeupForm';
import { supabase } from '../services/supabaseClient';

const START_DATE = new Date('2025-05-01');

function DashboardPage() {
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // yyyy-mm-dd
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*');
    setStudents(data || []);
  };

  const fetchLessons = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*, student:student_id(name, grade, school)')
      .gte('date', '2025-05-01');
    if (error) console.error(error);
    setLessons(data || []);
  };

  const generateLessonsForDate = async (date) => {
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date(date).getDay()];
    const existingLessons = await supabase
      .from('lessons')
      .select('student_id')
      .eq('date', date);

    const studentIdsAlreadyScheduled = new Set((existingLessons.data || []).map(l => l.student_id));

    const insertList = students
      .filter(s => {
        try {
          const schedule = JSON.parse(s.schedule || '{}');
          return schedule && schedule[dayOfWeek] && !studentIdsAlreadyScheduled.has(s.id);
        } catch {
          return false;
        }
      })
      .map(s => {
        const schedule = JSON.parse(s.schedule);
        return {
          date,
          student_id: s.id,
          start_time: schedule[dayOfWeek],
          status: '예정',
          is_makeup: false,
        };
      });

    if (insertList.length > 0) {
      await supabase.from('lessons').insert(insertList);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('정말 삭제할까요?');
    if (!ok) return;
    await supabase.from('students').delete().eq('id', id);
    fetchStudents();
  };

  const handleEdit = (student) => {
    setEditingId(student.id);
    setEditForm({
      name: student.name,
      school: student.school,
      grade: student.grade,
      teacher: student.teacher,
      schedule: JSON.parse(student.schedule || '{}'),
    });
  };

  const handleEditSubmit = async () => {
    const { error } = await supabase.from('students').update({
      ...editForm,
      schedule: JSON.stringify(editForm.schedule),
    }).eq('id', editingId);
    if (!error) {
      setEditingId(null);
      setEditForm(null);
      fetchStudents();
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      generateLessonsForDate(selectedDate).then(fetchLessons);
    }
  }, [students, selectedDate]);

  return (
    <div style={{ padding: '40px' }}>
      <h1>📅 수업 관리 대시보드</h1>

      <label>날짜 선택: </label>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
      />

      <StudentForm onStudentAdded={fetchStudents} />

      <h2 style={{ marginTop: '30px' }}>👩‍🎓 등록된 학생 목록</h2>
      {students.length === 0 ? (
        <p>등록된 학생이 없습니다.</p>
      ) : (
        <ul>
          {students.map((s) => (
            <li key={s.id}>
              {editingId === s.id ? (
                <div>
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  <input value={editForm.school} onChange={(e) => setEditForm({ ...editForm, school: e.target.value })} />
                  <select value={editForm.grade} onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}>
                    {['중1', '중2', '중3', '고1', '고2', '고3'].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                  <input value={editForm.teacher} onChange={(e) => setEditForm({ ...editForm, teacher: e.target.value })} />
                  {['월', '화', '수', '목', '금', '토'].map((day) => (
                    <div key={day}>
                      {day}:{' '}
                      <input
                        value={editForm.schedule[day] || ''}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            schedule: { ...editForm.schedule, [day]: e.target.value },
                          })
                        }
                      />
                    </div>
                  ))}
                  <button onClick={handleEditSubmit}>저장</button>
                  <button onClick={() => setEditingId(null)}>취소</button>
                </div>
              ) : (
                <div>
                  {s.name} ({s.grade}) - {s.school} / {s.teacher}
                  <br />
                  {s.schedule &&
                    Object.entries(JSON.parse(s.schedule)).map(([day, time]) => (
                      <span key={day}>{day}: {time} | </span>
                    ))}
                  <button onClick={() => handleEdit(s)}>수정</button>
                  <button onClick={() => handleDelete(s.id)} style={{ marginLeft: '5px', color: 'red' }}>삭제</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <LessonList date={selectedDate} lessons={lessons} refresh={fetchLessons} />
      <MakeupForm students={students} refreshLessons={fetchLessons} />
    </div>
  );
}

export default DashboardPage;
