function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(value) {
  if (!value) return 'No date';
  return String(value).slice(0, 10);
}

function getStationIcon(type, canSeeType) {
  if (!canSeeType) return '';
  if (type === 'heart') return '❤️';
  if (type === 'candy') return '🍬';
  if (type === 'kiss') return '💋';
  return '';
}

function isTaskActiveToday(task, today) {
  const taskDate = normalizeDate(task.taskDate);

  if (taskDate === today) return true;

  if (task.repeatDaily && taskDate !== 'No date' && taskDate <= today) {
    return true;
  }

  return false;
}

function RouteLine({ tasks, user }) {
  if (!tasks.length) return null;

  return (
    <div className="station-line route-only">
      {tasks.map((task, index) => {
        const isDone = task.done;
        const canSeeType = task.stationTypeOwner === user?.uid;
        const icon = getStationIcon(task.stationType, canSeeType);

        return (
          <div className="station-wrap" key={task.id}>
            <div className={`station-dot ${isDone ? 'done' : ''}`}>
              {isDone ? icon : ''}
            </div>

            {index < tasks.length - 1 && (
              <div className={`station-rail ${isDone ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DailyTracker({ tasks = [], user }) {
  const today = getTodayDate();
  const todayTasks = tasks.filter((task) => isTaskActiveToday(task, today));
  const completedCount = todayTasks.filter((task) => task.done).length;

  return (
    <section className="daily-route-card">
      <div className="daily-header">
        <div>
          <p className="daily-label">Daily Route</p>
          <h2>
            {completedCount}/{todayTasks.length} completed
          </h2>
        </div>

        <span className="daily-pill">Today · resets daily</span>
      </div>

      {todayTasks.length === 0 ? (
        <div className="daily-empty">Add today’s tasks to build your route.</div>
      ) : (
        <RouteLine tasks={todayTasks} user={user} />
      )}
    </section>
  );
}