// ✅ src/components/LessonList.jsx
import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import './LessonList.css'; // 외부 CSS 스타일 연결용

function LessonList({ date, lessons, refresh }) {
  const [editing, setEditing] = useState(null);
  const [reason, setReason] = useState('');
  const [makeupOption, setMakeupOption] = useState('보강');
  const [makeupDate, setMakeupDate] = useState('');
  const [makeupTime, setMakeupTime] = useState('');
  const [editingMakeupId, setEditingMakeupId] = useState(null);
  const [newMakeupDate, setNewMakeupDate] = useState('');
  const [newMakeupTime, setNewMakeupTime] = useState('');

  const handleAttend = async (lesson) => {
    const start = new Date();
    const end = new Date(start.getTime() + 90 * 60000);
    const formatTime = (d) => d.toTimeString().slice(0, 5);
    await supabase.from('lessons').update({
      status: '출석',
      start_time: formatTime(start),
      end_time: formatTime(end),
    }).eq('id', lesson.id);
    refresh();
  };

  const handleAbsent = async (lesson) => {
    let statusText = makeupOption === '보강X' ? '결석(보강X)' : '결석';
    await supabase.from('lessons').update({
      status: statusText,
      absence_reason: reason,
    }).eq('id', lesson.id);

    if (makeupOption === '보강' && makeupDate && makeupTime) {
      await supabase.from('lessons').insert({
        date: makeupDate,
        student_id: lesson.student_id,
        start_time: makeupTime,
        status: '보강',
        is_makeup: true,
      });
    }

    setEditing(null);
    setReason('');
    setMakeupDate('');
    setMakeupTime('');
    refresh();
  };

  const handleDeleteLesson = async (lessonId) => {
    const ok = window.confirm('이 수업을 정말 삭제하시겠습니까?');
    if (!ok) return;
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (error) {
      alert('삭제 실패: ' + error.message);
    } else {
      refresh();
    }
  };

  const handleMoveMakeup = async (lessonId) => {
    if (!newMakeupDate || !newMakeupTime) return alert('날짜와 시간을 입력하세요.');
    await supabase.from('lessons').update({
      date: newMakeupDate,
      start_time: newMakeupTime,
    }).eq('id', lessonId);
    setEditingMakeupId(null);
    setNewMakeupDate('');
    setNewMakeupTime('');
    refresh();
  };

  const filteredLessons = lessons.filter((l) => l.date === date);

  return (
    <div style={{ marginTop: '30px' }}>
      <h2>📋 {date} 수업 리스트</h2>
      {filteredLessons.length === 0 ? <p>수업이 없습니다.</p> : (
        <table className="lesson-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>학교</th>
              <th>학년</th>
              <th>시간</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredLessons.map((lesson) => {
              const student = lesson.student || {};
              const statusColor = lesson.status?.startsWith('결석') ? 'gray' : lesson.status === '출석' ? 'green' : lesson.status === '보강' ? 'blue' : '';
              const makeupInfo = lessons.find(
                (l) => l.student_id === lesson.student_id && l.is_makeup && l.status === '보강'
              );

              return (
                <tr key={lesson.id}>
                  <td>{student.name || '이름 없음'}</td>
                  <td>{student.school}</td>
                  <td>{student.grade}</td>
                  <td>{lesson.start_time || '예정'} ~ {lesson.end_time || '예정'}</td>
                  <td style={{ color: statusColor }}>
                    {lesson.status}
                    {lesson.status?.startsWith('결석') && lesson.is_makeup === false && makeupInfo && (
                      <div style={{ color: 'green', fontSize: '0.85em' }}>
                        → 보강 예정: {makeupInfo.date} {makeupInfo.start_time}
                      </div>
                    )}
                  </td>
                  <td>
                    <button onClick={() => handleAttend(lesson)}>출석</button>
                    <button onClick={() => setEditing(lesson.id)}>결석</button>
                    <button onClick={() => handleDeleteLesson(lesson.id)} style={{ color: 'red' }}>삭제</button>
                    {editing === lesson.id && (
                      <div style={{ marginTop: '5px' }}>
                        <input
                          placeholder="결석 사유"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <select value={makeupOption} onChange={(e) => setMakeupOption(e.target.value)}>
                          <option>보강</option>
                          <option>보강X</option>
                        </select>
                        {makeupOption === '보강' && (
                          <>
                            <input
                              type="date"
                              value={makeupDate}
                              onChange={(e) => setMakeupDate(e.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="시간 예: 오후 3:00"
                              value={makeupTime}
                              onChange={(e) => setMakeupTime(e.target.value)}
                            />
                          </>
                        )}
                        <button onClick={() => handleAbsent(lesson)}>저장</button>
                      </div>
                    )}
                    {lesson.is_makeup && (
                      <div style={{ marginTop: '5px' }}>
                        <button onClick={() => setEditingMakeupId(lesson.id)}>보강일 이동</button>
                        {editingMakeupId === lesson.id && (
                          <div>
                            <input
                              type="date"
                              value={newMakeupDate}
                              onChange={(e) => setNewMakeupDate(e.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="시간 예: 오후 4:30"
                              value={newMakeupTime}
                              onChange={(e) => setNewMakeupTime(e.target.value)}
                            />
                            <button onClick={() => handleMoveMakeup(lesson.id)}>이동</button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default LessonList;
