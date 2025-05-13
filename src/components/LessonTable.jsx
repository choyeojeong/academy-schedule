import { useState } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../utils/supabaseClient';

function LessonTable({ lessons, studentsMap, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [startTimes, setStartTimes] = useState({});
  const [absentInfo, setAbsentInfo] = useState(null);

  // 날짜별 그룹핑
  const grouped = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.date]) acc[lesson.date] = [];
    acc[lesson.date].push(lesson);
    return acc;
  }, {});

  // 출석 처리
  const handleAttend = async (lesson, inputTime) => {
    const start = inputTime ?? dayjs().format('HH:mm');
    const end = dayjs(`${lesson.date} ${start}`)
      .add(90, 'minute')
      .format('HH:mm');
    await supabase
      .from('lessons')
      .update({ status: '출석', start, end })
      .eq('id', lesson.id);
    setEditingId(null);
    onUpdate();
  };

  // 개별 수업 삭제
  const handleLessonDelete = async (lesson) => {
    if (!window.confirm('이 수업을 정말 삭제하시겠습니까?')) return;
    await supabase.from('lessons').delete().eq('id', lesson.id);
    onUpdate();
  };

  // 결석 처리 저장
  const handleAbsentSubmit = async () => {
    const { lesson, reason, makeup, makeupDate, makeupTime } = absentInfo;
    const statusText =
      makeup === 'O'
        ? `결석보강 (${reason})`
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
      await supabase.from('lessons').insert({
        student_id: s.id,
        date: makeupDate,
        time: makeupTime,
        student_name: s.name,
        student_school: s.school,
        student_grade: s.grade,
        student_teacher: s.teacher,
        status: `보강 (${lesson.date} 결석)`,
      });
    }

    setAbsentInfo(null);
    onUpdate();
  };

  // 보강수업 이동
  const handleMoveMakeup = async (original, newDate, newTime) => {
    await supabase.from('lessons').delete().match({
      student_id: original.student_id,
      date: original.makeup_date,
      time: original.makeup_time,
      status: `보강 (${original.date} 결석)`,
    });
    await supabase.from('lessons').insert({
      student_id: original.student_id,
      date: newDate,
      time: newTime,
      student_name: studentsMap[original.student_id].name,
      student_school: studentsMap[original.student_id].school,
      student_grade: studentsMap[original.student_id].grade,
      student_teacher: studentsMap[original.student_id].teacher,
      status: `보강 (${original.date} 결석)`,
    });
    await supabase
      .from('lessons')
      .update({ makeup_date: newDate, makeup_time: newTime })
      .eq('id', original.id);

    onUpdate();
  };

  const handleMoveClick = (lesson) => {
    const newDate = prompt('새 보강 날짜 (YYYY-MM-DD)');
    const newTime = prompt('새 보강 시간 (HH:mm)');
    if (newDate && newTime) handleMoveMakeup(lesson, newDate, newTime);
  };

  // 메모 저장
  const handleNoteChange = async (id, note) => {
    await supabase.from('lessons').update({ note }).eq('id', id);
    onUpdate();
  };

  return (
    <div>
      {Object.keys(grouped).map((date) => (
        <div key={date} style={{ marginBottom: 40 }}>
          <h3>
            {date} ({dayjs(date).format('dddd')})
          </h3>
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
              {grouped[date].map((l, i) => {
                const s = studentsMap[l.student_id];
                const status = l.status || '';
                const isAttendance = status.startsWith('출석');
                const isAbsence = status.startsWith('결석');
                const isMakeupRecord = status.startsWith('보강');
                return (
                  <tr key={l.id}>
                    <td>{i + 1}</td>
                    <td>{l.time?.slice(0, 5)}</td>
                    <td>{s?.name}</td>
                    <td>{s?.school}</td>
                    <td>{s?.grade}</td>
                    <td>{s?.teacher}</td>
                    <td>
                      {isAttendance ? (
                        `${l.start.slice(0,5)} - ${l.end.slice(0,5)}`
                      ) : isAbsence && !isMakeupRecord ? (
                        <>
                          {status}
                          {l.makeup_date && (
                            <span>
                              {' '}(보강: {l.makeup_date} {l.makeup_time.slice(0,5)})
                            </span>
                          )}
                          {l.makeup_date && (
                            <button onClick={() => handleMoveClick(l)}>
                              보강수업이동
                            </button>
                          )}
                        </>
                      ) : editingId === l.id ? (
                        <div>
                          <input
                            type="text"
                            placeholder="예: 16:00"
                            value={startTimes[l.id] || ''}
                            onChange={(e) =>
                              setStartTimes((prev) => ({
                                ...prev,
                                [l.id]: e.target.value,
                              }))
                            }
                          />
                          <button onClick={() => handleAttend(l, startTimes[l.id])}>
                            저장
                          </button>{' '}
                          <button onClick={() => handleAttend(l)}>
                            지금부터
                          </button>{' '}
                          <button onClick={() => setEditingId(null)}>
                            취소
                          </button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setEditingId(l.id)}>
                            출석
                          </button>{' '}
                          <button
                            onClick={() =>
                              setAbsentInfo({
                                lesson: l,
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
                    </td>
                    <td>
                      <input
                        type="text"
                        defaultValue={l.note || ''}
                        onBlur={(e) => handleNoteChange(l.id, e.target.value)}
                      />
                    </td>
                    <td>
                      <button onClick={() => handleLessonDelete(l)}>
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

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
                    setAbsentInfo((prev) => ({
                      ...prev,
                      makeupDate: e.target.value,
                    }))
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
                    setAbsentInfo((prev) => ({
                      ...prev,
                      makeupTime: e.target.value,
                    }))
                  }
                />
              </div>
            </>
          )}
          <button onClick={handleAbsentSubmit}>저장</button>{' '}
          <button onClick={() => setAbsentInfo(null)}>취소</button>
        </div>
      )}
    </div>
  );
}

export default LessonTable;
