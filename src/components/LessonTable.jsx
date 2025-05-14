import { useState } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../utils/supabaseClient';

function LessonTable({ lessons, studentsMap, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [startTimes, setStartTimes] = useState({});
  const [moveRowId, setMoveRowId] = useState(null);
  const [moveInfoMap, setMoveInfoMap] = useState({});
  const [absentInfoMap, setAbsentInfoMap] = useState({});

  const handleAttend = async (lesson, inputTime) => {
    const start = inputTime ?? dayjs().format('HH:mm');
    const end = dayjs(`${lesson.date} ${start}`).add(90, 'minute').format('HH:mm');
    await supabase.from('lessons').update({ status: '출석', start, end }).eq('id', lesson.id);
    setEditingId(null);
    onUpdate();
  };

  const handleResetStatus = async (lesson) => {
    const isMakeup = (lesson.status || '').startsWith('보강');
    await supabase
      .from('lessons')
      .update({
        start: null,
        end: null,
        ...(isMakeup ? {} : { status: null })
      })
      .eq('id', lesson.id);
    setEditingId(null);
    onUpdate();
  };

  const handleMoveSubmit = async (lessonId) => {
    const moveInfo = moveInfoMap[lessonId];
    const { lesson, newDate, newTime, reason } = moveInfo;
    const oldPattern = `보강 (${lesson.date} 결석, 사유: ${reason})`;

    await supabase.from('lessons').delete().like('status', `${oldPattern}%`);

    const s = studentsMap[lesson.student_id];
    if (!s) return;

    await supabase.from('lessons').insert({
      student_id: s.id,
      date: newDate,
      time: newTime,
      student_name: s.name,
      student_school: s.school,
      student_grade: s.grade,
      student_teacher: s.teacher,
      status: oldPattern,
    });

    await supabase
      .from('lessons')
      .update({ makeup_date: newDate, makeup_time: newTime })
      .eq('id', lesson.id);

    setMoveRowId(null);
    setMoveInfoMap((prev) => {
      const next = { ...prev };
      delete next[lessonId];
      return next;
    });
    onUpdate();
  };

  const handleNoteChange = async (id, note) => {
    await supabase.from('lessons').update({ note }).eq('id', id);
    onUpdate();
  };

  const handleLessonDelete = async (lesson) => {
    if (!window.confirm('이 수업을 정말 삭제하시겠습니까?')) return;
    await supabase.from('lessons').delete().eq('id', lesson.id);
    onUpdate();
  };

  const grouped = lessons.reduce((acc, lesson) => {
    if (!studentsMap[lesson.student_id]) return acc;
    acc[lesson.date] = acc[lesson.date] || [];
    acc[lesson.date].push(lesson);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(grouped).map(([date, lessonsOnDate]) => (
        <div key={date} style={{ marginBottom: 40 }}>
          <h3>{date} ({dayjs(date).format('dddd')})</h3>
          <table border="1" cellPadding="6" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>번호</th>
                <th>시간</th>
                <th>이름</th>
                <th>학교</th>
                <th>학년</th>
                <th>선생님</th>
                <th>출결</th>
                <th>초기화</th>
                <th>메모</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {lessonsOnDate.map((lesson, idx) => {
                const s = studentsMap[lesson.student_id];
                const status = lesson.status || '';
                const isAttendance = status.startsWith('출석');
                const isOriginalAbsence = status.startsWith('결석 (');
                const isMakeupLesson = status.startsWith('보강');
                const absentInfo = absentInfoMap[lesson.id];

                let origInfo = null;
                if (isMakeupLesson) {
                  const m = status.match(/보강\s*\(\s*(.*?)\s*결석,\s*사유:\s*(.*?)\s*\)/);
                  if (m) {
                    origInfo = { date: m[1], reason: m[2] };
                  }
                }

                if (!s) return null;

                return (
                  <tr
                    key={lesson.id}
                    style={{
                      backgroundColor: isMakeupLesson ? 'rgba(255, 200, 200, 0.3)' : 'transparent',
                    }}
                  >
                    <td>{idx + 1}</td>
                    <td>{lesson.time?.slice(0, 5)}{isMakeupLesson ? ' (보강)' : ''}</td>
                    <td>{s.name}</td>
                    <td>{s.school}</td>
                    <td>{s.grade}</td>
                    <td>{s.teacher}</td>
                    <td>
                      {isMakeupLesson && origInfo && (
                        <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 6 }}>
                          원 결석일: {origInfo.date}<br />
                          사유: {origInfo.reason}
                        </div>
                      )}

                      {moveRowId === lesson.id ? (
                        <div style={{ fontSize: '0.85em' }}>
                          <div>
                            날짜:{' '}
                            <input
                              type="date"
                              value={moveInfoMap[lesson.id]?.newDate || ''}
                              onChange={(e) =>
                                setMoveInfoMap((prev) => ({
                                  ...prev,
                                  [lesson.id]: {
                                    ...prev[lesson.id],
                                    newDate: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            시간:{' '}
                            <input
                              type="text"
                              placeholder="예: 16:00"
                              value={moveInfoMap[lesson.id]?.newTime || ''}
                              onChange={(e) =>
                                setMoveInfoMap((prev) => ({
                                  ...prev,
                                  [lesson.id]: {
                                    ...prev[lesson.id],
                                    newTime: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <button onClick={() => handleMoveSubmit(lesson.id)}>저장</button>{' '}
                          <button
                            onClick={() => {
                              setMoveRowId(null);
                              setMoveInfoMap((prev) => {
                                const copy = { ...prev };
                                delete copy[lesson.id];
                                return copy;
                              });
                            }}
                          >
                            취소
                          </button>
                        </div>
                      ) : isAttendance ? (
                        `${lesson.start?.slice(0, 5)} - ${lesson.end?.slice(0, 5)}`
                      ) : isOriginalAbsence ? (
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                          {status}
                          {lesson.makeup_date && (
                            <div>
                              보강일: {lesson.makeup_date} {lesson.makeup_time}
                              <button
                                onClick={() => {
                                  setMoveRowId(lesson.id);
                                  setMoveInfoMap((prev) => ({
                                    ...prev,
                                    [lesson.id]: {
                                      lesson,
                                      newDate: lesson.makeup_date,
                                      newTime: lesson.makeup_time,
                                      reason: status.match(/결석 \((.*?)\)/)?.[1] || '',
                                    },
                                  }));
                                }}
                              >
                                보강이동
                              </button>
                            </div>
                          )}
                        </div>
                      ) : editingId === lesson.id ? (
                        <div>
                          <input
                            type="text"
                            placeholder="예: 16:00"
                            value={startTimes[lesson.id] || ''}
                            onChange={(e) =>
                              setStartTimes((prev) => ({
                                ...prev,
                                [lesson.id]: e.target.value,
                              }))
                            }
                          />
                          <button onClick={() => handleAttend(lesson, startTimes[lesson.id])}>저장</button>
                          <button onClick={() => handleAttend(lesson)}>지금부터</button>
                          <button onClick={() => setEditingId(null)}>취소</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setEditingId(lesson.id)}>출석</button>
                          <button
                            onClick={() =>
                              setAbsentInfoMap((prev) => ({
                                ...prev,
                                [lesson.id]: {
                                  lesson,
                                  reason: '',
                                  makeup: 'X',
                                  makeupDate: '',
                                  makeupTime: '',
                                },
                              }))
                            }
                          >
                            결석
                          </button>
                        </>
                      )}
                    </td>
                    <td>
                      <button onClick={() => handleResetStatus(lesson)}>출결상태초기화</button>
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={lesson.note || ''}
                        onBlur={(e) => handleNoteChange(lesson.id, e.target.value)}
                      />
                    </td>
                    <td>
                      <button onClick={() => handleLessonDelete(lesson)}>삭제</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default LessonTable;
