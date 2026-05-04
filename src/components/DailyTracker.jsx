import { useState } from 'react';

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

function formatDate(dateKey) {
  if (dateKey === 'No date') return 'No date';

  return new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStationIcon(type, canSeeType) {
  if (!canSeeType) return '';
  if (type === 'heart') return '❤️';
  if (type === 'candy') return '🍬';
  if (type === 'kiss') return '💋';
  return '';
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
  const [openDates, setOpenDates] = useState({});
  const today = getTodayDate();

  const tasksByDate = tasks.reduce((acc, task) => {
    const dateKey = normalizeDate(task.taskDate);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {});

  const todayTasks = tasksByDate[today] || [];
  const pastDates = Object.keys(tasksByDate)
    .filter((dateKey) => dateKey !== today)
    .sort((a, b) => b.localeCompare(a));

  const todayDone = todayTasks.filter((task) => task.done).length;

  return (
    <section className="daily-route-full-page">
      <div className="daily-route-card">
        <div className="daily-header">
          <div>
            <p className="daily-label">Daily Route</p>
            <h2>
              {todayDone}/{todayTasks.length} completed
            </h2>
          </div>

          <span className="daily-pill">Resets daily</span>
        </div>

        {todayTasks.length === 0 ? (
          <div className="daily-empty">
            Add today’s tasks to build your route.
          </div>
        ) : (
          <RouteLine tasks={todayTasks} user={user} />
        )}
      </div>

      <div className="daily-history">
        <h3>Past Daily Routes</h3>

        {pastDates.map((dateKey) => {
          const dateTasks = tasksByDate[dateKey];
          const doneCount = dateTasks.filter((task) => task.done).length;
          const isOpen = openDates[dateKey];

          return (
            <div className="history-day" key={dateKey}>
              <button
                type="button"
                className="history-header"
                onClick={() =>
                  setOpenDates((prev) => ({
                    ...prev,
                    [dateKey]: !prev[dateKey],
                  }))
                }
              >
                <span>
                  {isOpen ? '▾' : '▸'} {formatDate(dateKey)}
                </span>

                <strong>
                  {doneCount}/{dateTasks.length}
                </strong>
              </button>

              {isOpen && (
                <div className="history-body">
                  <RouteLine tasks={dateTasks} user={user} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}