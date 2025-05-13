import { useState } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../utils/supabaseClient';

function LessonTable({ lessons, studentsMap, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [startTimes, setStartTimes] = useState({});
  const [absentInfo, setAbsentInfo] = useState(null);
  const [moveInfo, setMoveInfo] = useState(null);

  // 날짜별 레슨 그룹
  const grouped = lessons.reduce((acc, lesson) => {
    acc[lesson.date] = acc[lesson.date] || [];
    acc[lesson.date].push(lesson);
    return acc;
  }, {});

  // 출석 처리
  const handleAttend = async (lesson, inputTime) => {
    const start = inputTime ?? dayjs().format('HH:mm');
    const end = dayjs(`${lesson.date} ${start}`).add(90, 'minute').format('HH:mm');
    await supabase
      .from('lessons')
      .update({ status: '출석', start, end })
      .eq('id', lesson.id);
    setEditingId(null);
    onUpdate();
  };

  // 결석/보강 처리
  const handleAbsentSubmit = async () => {
    const { lesson, reason, makeup, makeupDate, makeupTime } = absentInfo;
    const statusText = makeup === 'O'
      ? `결석 (${reason}) 보강O`
      : `결석 (${reason}) 보강X`;

    await supabase
      .from('lessons')
      .update({
        status: statusText,
        makeup_date: makeup === 'O' ? makeupDate : null,
        makeup_time: makeup === 'O' ? makeupTime : null,
      })
      .eq('id', lesson.id);

    if (makeup === 'O') {
      const s = studentsMap[lesson.student_id];
      await supabase
        .from('lessons')
        .insert({
          student_id: s?.id,
          date: makeupDate,
          time: makeupTime,
          student_name: s?.name,
          student_school: s?.school,
          student_grade: s?.grade,
          student_teacher: s?.teacher,
          status: `보강 (${lesson.date} 결석, 사유: ${reason})`,
        });
    }

    setAbsentInfo(null);
    onUpdate();
  };

  // 보강 이동 처리
  const handleMoveSubmit = async () => {
    const { lesson, newDate, newTime, reason } = moveInfo;
    const oldPattern = `보강 (${lesson.date} 결석, 사유: ${reason})`;
    // 기존 보강 수업 삭제
    await supabase
      .from('lessons')
      .delete()
      .like('status', `${oldPattern}%`);
    const s = studentsMap[lesson.student_id];
    // 새로운 보강 수업 추가
    await supabase
      .from('lessons')
      .insert({
        student_id: s?.id,
        date: newDate,
        time: newTime,
        student_name: s?.name,
        student_school: s?.school,
        student_grade: s?.grade,
        student_teacher: s?.teacher,
        status: oldPattern,
      });
    // 원 결석일에도 보강 정보 갱신
    await supabase
      .from('lessons')
      .update({ makeup_date: newDate, makeup_time: newTime })
      .eq('id', lesson.id);

    setMoveInfo(null);
    onUpdate();
  };

  // 수업 삭제
  const handleLessonDelete = async (lesson) => {
    if (!window.confirm('이 수업을 정말 삭제하시겠습니까?')) return;
    await supabase
      .from('lessons')
      .delete()
      .eq('id', lesson.id);
    onUpdate();
  };

  // 메모 저장
  const handleNoteChange = async (id, note) => {
    await supabase
      .from('lessons')
      .update({ note })
      .eq('id', id);
    onUpdate();
  };

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
                <th>메모</th>
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {lessonsOnDate.map((lesson, idx) => {
                const s = studentsMap[lesson.student_id] || {};
                const status = lesson.status || '';
                const isAttendance = status.startsWith('출석');
                const isOriginalAbsence = status.startsWith('결석 (') && !status.startsWith('보강');
                const isMakeupLesson = status.startsWith('보강');

                // 원 결석 사유 추출
                let reason = '';
                if (isOriginalAbsence) {
                  const m = status.match(/결석 \((.*)\) 보강[OX]/);
                  reason = m ? m[1] : '';
                }
                // 보강 레슨 원래 정보 추출
                let origInfo = null;
                if (isMakeupLesson) {
                  const m = status.match(/보강 \((.*?) 결석, 사유: (.*?)\)/);
                  if (m) origInfo = { date: m[1], reason: m[2] };
                }

                return (
                  <tr key={lesson.id}>
                    <td>{idx + 1}</td>
                    <td>
                      {lesson.time?.slice(0, 5)}{isMakeupLesson ? ' (보강)' : ''}
                    </td>
                    <td>{s.name || ''}</td>
                    <td>{s.school || ''}</td>
                    <td>{s.grade || ''}</td>
                    <td>{s.teacher || ''}</td>
                    <td>
                      {isAttendance ? (
                        `${lesson.start?.slice(0, 5)} - ${lesson.end?.slice(0, 5)}`
                      ) : isOriginalAbsence ? (
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                          {status}
                          {lesson.makeup_date && (
                            <div>보강일: {lesson.makeup_date} {lesson.makeup_time}</div>
                          )}
                          <button
                            onClick={() =>
                              setMoveInfo({
                                lesson,
                                newDate: lesson.makeup_date,
                                newTime: lesson.makeup_time,
                                reason,
                              })
                            }
                          >
                            보강이동
                          </button>
                        </div>
                      ) : (
                        <>
                          {isMakeupLesson && origInfo && (
                            <div style={{ fontSize: '0.9em', color: '#666', marginBottom: 4 }}>
                              원 결석일: {origInfo.date}<br />
                              사유: {origInfo.reason}
                            </div>
                          )}
                          {editingId === lesson.id ? (
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
                              <button onClick={() => handleAttend(lesson, startTimes[lesson.id])}>
                                저장
                              </button>
                              <button onClick={() => handleAttend(lesson)}>지금부터</button>
                              <button onClick={() => setEditingId(null)}>취소</button>
                            </div>
                          ) : (
                            <>
                              <button onClick={() => setEditingId(lesson.id)}>출석</button>
                              <button
                                onClick={() =>
                                  setAbsentInfo({
                                    lesson,
                                    reason: '',
                                    makeup: 'X',
                                    makeupDate: '',
                                    makeupTime: '',
                                  })
                                }
                              >
                                결석
                              </button>
                            </>
                          )}
                        </>
                      )}
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

      {/* 결석 처리 모달 */}
      {absentInfo && (
        <div style={{ padding: 20, border: '1px solid gray', marginTop: 20 }}>
          <h4>결석 처리</h4>
          <div>
            사유:{' '}
            <input
              value={absentInfo.reason}
              onChange={(e) =>
                setAbsentInfo((prev) => ({ ...prev, reason: e.target.value }))
              }
            />
          </div>
          <div>
            보강 여부:{' '}
            <select
              value={absentInfo.makeup}
              onChange={(e) =>
                setAbsentInfo((prev) => ({ ...prev, makeup: e.target.value }))
              }
            >
              <option value="X">보강X</option>
              <option value="O">보강O</option>
            </select>
          </div>
          {absentInfo.makeup === 'O' && (
            <>
              <div>
                보강 날짜:{' '}
                <input
                  type="date"
                  value={absentInfo.makeupDate}
                  onChange={(e) =>
                    setAbsentInfo((prev) => ({ ...prev, makeupDate: e.target.value }))
                  }
                />
              </div>
              <div>
                보강 시간:{' '}
                <input
                  type="text"
                  placeholder="예: 16:00"
                  value={absentInfo.makeupTime}
                  onChange={(e) =>
                    setAbsentInfo((prev) => ({ ...prev, makeupTime: e.target.value }))
                  }
                />
              </div>
            </>
          )}
          <button onClick={handleAbsentSubmit}>저장</button>{' '}
          <button onClick={() => setAbsentInfo(null)}>취소</button>
        </div>
      )}

      {/* 보강 이동 모달 */}
      {moveInfo && (
        <div style={{ padding: 20, border: '1px solid gray', marginTop: 20 }}>
          <h4>보강 이동</h4>
          <div>
            새 보강 날짜:{' '}
            <input
              type="date"
              value={moveInfo.newDate || ''}
              onChange={(e) =>
                setMoveInfo((prev) => ({ ...prev, newDate: e.target.value }))
              }
            />
          </div>
          <div>
            새 보강 시간:{' '}
            <input
              type="text"
              placeholder="예: 16:00"
              value={moveInfo.newTime || ''}
              onChange={(e) =>
                setMoveInfo((prev) => ({ ...prev, newTime: e.target.value }))
              }
            />
          </div>
          <button onClick={handleMoveSubmit}>저장</button>{' '}
          <button onClick={() => setMoveInfo(null)}>취소</button>
        </div>
      )}
    </div>
  );
}

export default LessonTable;
