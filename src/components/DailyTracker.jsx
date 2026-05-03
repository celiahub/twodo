function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getStationIcon(type) {
  if (type === 'heart') return '❤️';
  if (type === 'candy') return '🍬';
  if (type === 'kiss') return '💋';
  return '';
}

function playDing() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();

    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      1320,
      audioCtx.currentTime + 0.12
    );

    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.35);
  } catch (err) {
    console.log('Sound not available:', err);
  }
}

export default function DailyTracker({ tasks = [], user }) {
  const today = getTodayDate();

  const todayTasks = tasks.filter((task) => task.taskDate === today);

  const completedCount = todayTasks.filter((task) => task.done).length;
  const totalCount = todayTasks.length;

  const handleStationClick = (task) => {
    if (task.done) playDing();
  };

  return (
    <section className="daily-tracker">
      <div className="daily-header">
        <div>
          <p className="daily-label">Daily Route</p>
          <h2>
            {completedCount}/{totalCount} completed
          </h2>
        </div>

        <span className="daily-pill">Resets daily</span>
      </div>

      {todayTasks.length === 0 ? (
        <div className="daily-empty">
          Add today’s tasks to build your route.
        </div>
      ) : (
        <>
          <div className="station-line">
            {todayTasks.map((task, index) => {
              const isDone = task.done;
              const canSeeType = task.stationTypeOwner === user?.uid;
              const icon = canSeeType ? getStationIcon(task.stationType) : '';

              return (
                <div className="station-wrap" key={task.id}>
                  <button
                    type="button"
                    className={`station-dot ${isDone ? 'done' : ''}`}
                    onClick={() => handleStationClick(task)}
                    title={
                      canSeeType && task.stationType !== 'normal'
                        ? `Private type: ${task.stationType}`
                        : 'Task station'
                    }
                  >
                    {isDone ? icon : ''}
                  </button>

                  {index < todayTasks.length - 1 && (
                    <div className={`station-rail ${isDone ? 'done' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="daily-mini-list">
            {todayTasks.map((task) => {
              const canSeeType = task.stationTypeOwner === user?.uid;
              const icon = canSeeType ? getStationIcon(task.stationType) : '';

              return (
                <div
                  key={task.id}
                  className={`daily-mini-task ${task.done ? 'completed' : ''}`}
                >
                  <span>{task.done ? icon || '●' : '○'}</span>
                  <p>{task.text}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}