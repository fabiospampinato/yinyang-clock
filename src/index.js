
/* VARIABLES */

const $APP = document.getElementById ( 'app' );
const $GOOD = document.getElementById ( 'good' );
const $BAD = document.getElementById ( 'bad' );
const $SEPARATOR = document.getElementById ( 'separator' );
const $THRESHOLD = document.getElementById ( 'threshold' );
const $CLOCK = document.getElementById ( 'clock' );

const OPTIONS = new URLSearchParams ( window.location.search );

const DATABASE_NAMESPACE = 'yyc';
const MIDNIGHT_MODE = OPTIONS.has ( 'midnight' );
const MINIMAL_MODE = OPTIONS.has ( 'minimal' );
const AMOLED_MODE = OPTIONS.has ( 'amoled' );

/* HELPERS */

const getTimestampAtMidnight = () => {

  const date = new Date ();

  date.setHours ( 0, 0, 0, 0 );

  return date.getTime ();

};

const getTimestampAtPreset = () => {

  return Date.now ();

};

const getMillisecondsSinceMidnight = () => {

  return getTimestampAtPreset () - getTimestampAtMidnight ();

};

const getClock = seconds => {

  const h = Math.floor ( ( seconds / ( 60 * 60 ) ) );
  const m = Math.floor ( ( seconds / 60 ) % 60 );
  const s = Math.floor ( seconds % 60 );

  return [h, m, s].map ( nr => String ( nr ).padStart ( 2, '0' ) ).join ( ':' );

};

const getRatio = () => {

  return Math.min ( 1, Math.max ( 0, ( State.goodMs () / ( State.goodMs () + State.badMs () ) ) ) );

};

const updateClasses = () => {

  $APP.classList.toggle ( 'is-midnight', MIDNIGHT_MODE );
  $APP.classList.toggle ( 'is-minimal', MINIMAL_MODE );
  $APP.classList.toggle ( 'is-amoled', AMOLED_MODE );

  $APP.classList.toggle ( 'is-good', State.good () );
  $APP.classList.toggle ( 'is-bad', !State.good () );

};

const updateClock = () => {

  const milliseconds = State.good () ? State.goodMs () : State.badMs ();
  const seconds = Math.floor ( milliseconds / 1000 );
  const clock = getClock ( seconds );

  $CLOCK.textContent = MINIMAL_MODE ? '' : clock;

};

const updateTimings = () => {

  const presentTimestamp = getTimestampAtPreset ();
  const elapsedMs = presentTimestamp - State.updateTimestamp ();
  const bucket = State[State.good () ? 'goodMs' : 'badMs'];

  bucket ( bucket () + elapsedMs );

  State.updateTimestamp ( presentTimestamp );

};

const updateGood = () => {

  $GOOD.style.flexGrow = getRatio ();

};

const updateBad = () => {

  $BAD.style.flexGrow = 1 - getRatio ();

};

const updateSeparator = () => {

  const percentage = `${getRatio () * 100}%`;

  $SEPARATOR.style.left = percentage;
  $SEPARATOR.style.top = percentage;

};

const updateReset = () => {

  if ( !MIDNIGHT_MODE ) return;

  if ( ( State.goodMs () + State.badMs () ) < 86_400_000 ) return;

  reset ();

};

const update = () => {

  updateTimings ();
  updateGood ();
  updateBad ();
  updateSeparator ();
  updateClasses ();
  updateClock ();
  updateReset ();

};

const flip = () => {

  update ();

  State.good ( !State.good () );

  update ();

};

const reset = () => {

  State.good ( false );
  State.goodMs ( 0 );
  State.badMs ( MIDNIGHT_MODE ? getMillisecondsSinceMidnight () : 0 );
  State.updateTimestamp ( Date.now () );

};

/* DATABASE */

const Database = {
  read: ( key, fallback ) => {
    try {
      return JSON.parse ( localStorage.getItem ( `${DATABASE_NAMESPACE}.${key}` ) || '' );
    } catch {
      Database.write ( key, fallback );
      return fallback;
    }
  },
  write: ( key, value ) => {
    return localStorage.setItem ( `${DATABASE_NAMESPACE}.${key}`, JSON.stringify ( value ) );
  },
  observable: ( key, fallback ) => {
    return function ( valueNext ) {
      if ( arguments.length ) {
        return Database.write ( key, valueNext );
      } else {
        return Database.read ( key, fallback );
      }
    };
  }
};

/* STATE */

const State = {
  good: Database.observable ( 'good', false ),
  goodMs: Database.observable ( 'goodMs', 0 ),
  badMs: Database.observable ( 'badMs', MIDNIGHT_MODE ? getMillisecondsSinceMidnight () : 0 ),
  updateTimestamp: Database.observable ( 'updateTimestamp', Date.now () )
};

/* INIT */

update ();

setInterval ( update, 1000 );

$APP.addEventListener ( 'click', event => {
  if ( event.ctrlKey || event.metaKey ) {
    if ( !confirm ( 'Are you sure you want to reset the clock?' ) ) return;
    reset ();
  } else {
    flip ();
  }
});

$APP.addEventListener ( 'touchend', event => {
  if ( event.touches.length < 3 ) return;
  if ( !confirm ( 'Are you sure you want to reset the clock?' ) ) return;
  reset ();
});

navigator.wakeLock.request ( 'screen' );
