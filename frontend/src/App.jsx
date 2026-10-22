
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { authenticate, cancelExistingBooking, createBooking, createDashboardCinema, createDashboardMovie, createDashboardScreen, createDashboardShowtime, generateDashboardSeats, getDashboardCinemas, getDashboardMovies, getDashboardShowtimes, getMovieById, getMovies, getMyBookings, getSeatsForShowtime, getShowtimesByMovieId } from './lib/api'
import './App.css'

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return ''

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return hours ? `${hours}h ${remainingMinutes}m` : `${minutes} min`
}

function getReleaseYear(releaseDate) {
  if (!releaseDate) return ''

  const year = new Date(releaseDate).getUTCFullYear()
  return Number.isNaN(year) ? '' : String(year)
}

function formatReleaseDate(releaseDate) {
  if (!releaseDate) return ''

  const date = new Date(releaseDate)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatShowtimeDateTime(startsAt) {
  if (!startsAt) return ''

  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatShowtimeTime(startsAt) {
  if (!startsAt) return ''

  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getShowtimeDateKey(startsAt) {
  if (!startsAt) return ''

  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatShowtimeDateParts(dateKey) {
  if (!dateKey) return { relativeLabel: '', dayName: '', dayMonth: '' }

  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return { relativeLabel: '', dayName: '', dayMonth: '' }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(year, month - 1, day)
  compareDate.setHours(0, 0, 0, 0)

  const diffDays = Math.round((compareDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let relativeLabel
  if (diffDays === 0) {
    relativeLabel = 'Today'
  } else if (diffDays === 1) {
    relativeLabel = 'Tomorrow'
  } else if (diffDays > 1 && diffDays < 7) {
    const dayOfWeek = date.getDay()
    relativeLabel = dayOfWeek === 0 || dayOfWeek === 6 ? 'Weekend' : 'Weekday'
  } else {
    relativeLabel = 'Screening'
  }

  const dayName = date.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase()
  const dayMonth = `${day} ${date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}`

  return { relativeLabel, dayName, dayMonth }
}

function formatTicketPrice(priceInPaise) {
  if (!Number.isFinite(priceInPaise) || priceInPaise < 0) return ''

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
  }).format(priceInPaise / 100)
}

function getSeatLabel(seat) {
  return `${seat.rowLabel}${seat.seatNumber}`
}

const MAX_BOOKING_SEATS = 12

function AuthForm({ onAuthenticated, message = '', initialMode = 'login', onModeChange }) {
  const [authMode, setAuthMode] = useState(initialMode)
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authStatus, setAuthStatus] = useState('idle')
  const [authError, setAuthError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const idPrefix = useId()

  async function submitAuthentication(event) {
    event.preventDefault()
    setAuthError('')

    if (authMode === 'register' && authForm.name.trim().length < 2) {
      setAuthError('Name must contain at least 2 non-space characters.')
      return
    }

    setAuthStatus('loading')

    try {
      const session = await authenticate({
        ...authForm,
        name: authForm.name.trim(),
        email: authForm.email.trim(),
      }, authMode)
      onAuthenticated(session)
      setAuthForm({ name: '', email: '', password: '' })
      setAuthStatus('idle')
    } catch (error) {
      setAuthError(error.message || 'Unable to authenticate.')
      setAuthStatus('error')
    }
  }

  return (
    <form className="auth-panel" onSubmit={submitAuthentication}>
      <div className="auth-ambient-glow" aria-hidden="true" />
      <div className="auth-panel-heading">
        <div>
          <span className="section-kicker">CONCIERGE ACCESS</span>
          <h3>{authMode === 'login' ? 'Sign in to continue' : 'Create your Cinevo account'}</h3>
        </div>
        <button
          className="auth-mode-toggle"
          type="button"
          onClick={() => {
            const nextMode = authMode === 'login' ? 'register' : 'login'
            setAuthMode(nextMode)
            onModeChange?.(nextMode)
            setAuthError('')
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }} aria-hidden="true">
            {authMode === 'login' ? 'person_add' : 'login'}
          </span>
          <span>{authMode === 'login' ? 'Create account' : 'I have an account'}</span>
        </button>
      </div>
      {authMode === 'register' && (
        <label className="auth-field">
          <span>Full Name</span>
          <input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            autoComplete="name"
            minLength="2"
            maxLength="100"
            required
            placeholder="e.g. Eleanor Vance"
            value={authForm.name}
            onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
          />
        </label>
      )}
      <label className="auth-field">
        <span>Email Address</span>
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          maxLength="255"
          required
          placeholder="name@cinevo.luxury"
          value={authForm.email}
          onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
        />
      </label>
      <div className="auth-field">
        <label htmlFor={`${idPrefix}-password`}>
          <span>Password</span>
        </label>
        <div className="password-input-row">
          <input
            id={`${idPrefix}-password`}
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            minLength={authMode === 'register' ? 8 : 1}
            maxLength="72"
            required
            placeholder="••••••••"
            value={authForm.password}
            onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
          />
          <button
            className="password-visibility-button"
            type="button"
            aria-controls={`${idPrefix}-password`}
            aria-pressed={showPassword}
            title={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
            <span className="visually-hidden">{showPassword ? 'Hide' : 'Show'} password</span>
          </button>
        </div>
        {authMode === 'register' && <small className="auth-field-hint">Use 8–72 characters.</small>}
      </div>
      {authError && <p className="auth-error" role="alert">{authError}</p>}
      {message && <p className="auth-error" role="alert">{message}</p>}
      <button className="primary-button auth-submit-button" type="submit" disabled={authStatus === 'loading'}>
        {authStatus === 'loading' ? (
          <>
            <span className="material-symbols-outlined spin-icon" aria-hidden="true">sync</span>
            <span>Please wait...</span>
          </>
        ) : (
          <>
            <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }} aria-hidden="true">arrow_forward</span>
          </>
        )}
      </button>
    </form>
  )
}

function AuthPage({ mode, onAuthenticated, onModeChange, onBack }) {
  const isRegistration = mode === 'register'

  return (
    <main className="auth-page">
      <button className="secondary-button back-button" type="button" onClick={onBack}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden="true">arrow_back</span>
        <span>Back to Movies</span>
      </button>
      <div className="auth-page-heading">
        <span className="section-kicker">{isRegistration ? 'YOUR NEXT SCREENING STARTS HERE' : 'WELCOME BACK TO CINEVO'}</span>
        <h1>{isRegistration ? 'Create your account.' : 'Sign in to Cinevo.'}</h1>
        <p>{isRegistration
          ? 'Create an account to book screenings and manage your reservations.'
          : 'Sign in to continue to your bookings and saved screenings.'}</p>
      </div>
      <AuthForm
        key={mode}
        initialMode={mode}
        onAuthenticated={onAuthenticated}
        onModeChange={onModeChange}
      />
    </main>
  )
}

function SeatSelection({ showtime, movie, authSession, onAuthenticated, onAuthenticationExpired, onBack }) {
  const [seats, setSeats] = useState([])
  const [selectedSeatIds, setSelectedSeatIds] = useState(() => new Set())
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [authError, setAuthError] = useState('')
  const [bookingStatus, setBookingStatus] = useState('idle')
  const [bookingError, setBookingError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [viewStep, setViewStep] = useState('seats')
  const bookingInFlight = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    getSeatsForShowtime(showtime.id, { signal: controller.signal })
      .then((loadedSeats) => {
        setSeats(loadedSeats)
        setSelectedSeatIds(new Set())
        setStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setErrorMessage(error.message || 'Unable to load this seat layout.')
        setStatus('error')
      })

    return () => controller.abort()
  }, [showtime.id, loadAttempt])

  const seatsByRow = useMemo(() => {
    const rows = new Map()
    seats.forEach((seat) => {
      if (!rows.has(seat.rowLabel)) rows.set(seat.rowLabel, [])
      rows.get(seat.rowLabel).push(seat)
    })
    return rows
  }, [seats])

  const selectedSeats = seats.filter((seat) => selectedSeatIds.has(seat.id))
  const ticketPrice = showtime.priceInPaise
  const totalPrice = Number.isFinite(ticketPrice) && ticketPrice >= 0
    ? ticketPrice * selectedSeats.length
    : null

  function toggleSeat(seat) {
    if (
      seat.status !== 'available' ||
      (!selectedSeatIds.has(seat.id) && selectedSeatIds.size >= MAX_BOOKING_SEATS)
    ) return

    setSelectedSeatIds((current) => {
      const next = new Set(current)
      if (next.has(seat.id)) {
        next.delete(seat.id)
      } else {
        next.add(seat.id)
      }
      return next
    })
  }

  function retryLoading() {
    setSeats([])
    setSelectedSeatIds(new Set())
    setErrorMessage('')
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  async function submitBooking() {
    if (!authSession?.token) {
      setShowAuthForm(true)
      setAuthError('Sign in or create an account before booking.')
      return
    }

    if (selectedSeatIds.size === 0 || bookingInFlight.current) return

    bookingInFlight.current = true
    setBookingStatus('loading')
    setBookingError('')

    try {
      const result = await createBooking(
        { showtimeId: showtime.id, seatIds: [...selectedSeatIds] },
        authSession.token,
      )
      setConfirmation(result)
      setBookingStatus('success')
    } catch (error) {
      if (error.status === 401) {
        onAuthenticationExpired()
        setShowAuthForm(true)
        setAuthError('Your sign-in has expired. Please sign in again.')
      }

      if (error.status === 409) {
        setBookingError('One or more selected seats are no longer available. Seat availability has been refreshed.')
        try {
          const refreshedSeats = await getSeatsForShowtime(showtime.id)
          setSeats(refreshedSeats)
          setSelectedSeatIds((current) => new Set(
            [...current].filter((seatId) =>
              refreshedSeats.some((seat) => seat.id === seatId && seat.status === 'available'),
            ),
          ))
        } catch (refreshError) {
          setBookingError(`The selected seats may no longer be available. Refresh failed: ${refreshError.message}`)
        }
      } else if (error.status !== 401) {
        setBookingError(error.message || 'Unable to create the booking.')
      }

      setBookingStatus('error')
    } finally {
      bookingInFlight.current = false
    }
  }

  const confirmationSeatIds = new Set(
    confirmation?.seats?.map((seat) => seat.seatId) ?? [],
  )
  const confirmedSeats = seats.filter((seat) => confirmationSeatIds.has(seat.id))
  const finalConfirmedSeats = confirmedSeats.length > 0 ? confirmedSeats : selectedSeats

  return (
    <section className="seat-selection" aria-labelledby="seat-selection-heading">
      {/* 1. Sub-navigation Context Strip & Booking Stepper */}
      <div className="booking-context-strip">
        <div className="booking-context-inner">
          <div className="booking-meta-group">
            <button
              className="booking-back-link"
              type="button"
              onClick={viewStep === 'review' ? () => setViewStep('seats') : onBack}
            >
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              <span>
                {viewStep === 'review'
                  ? `Modify Seats (${movie?.title || 'Screening'})`
                  : 'Back to Showtimes'}
              </span>
            </button>
            <div className="booking-meta-divider" aria-hidden="true" />
            <div className="showtime-meta-pill">
              <span className="meta-pulse-dot" aria-hidden="true" />
              <span className="meta-movie-title">{movie?.title || showtime.movieTitle || 'Exclusive Screening'}</span>
              <span className="meta-sep" aria-hidden="true">•</span>
              <span className="meta-time">{formatShowtimeDateTime(showtime.startsAt)}</span>
              {showtime.screenName && (
                <>
                  <span className="meta-sep" aria-hidden="true">•</span>
                  <span className="meta-screen">{showtime.screenName}</span>
                </>
              )}
            </div>
          </div>

          <nav aria-label="Booking progress" className="booking-stepper">
            <div className="stepper-step completed">
              <span className="stepper-badge"><span className="material-symbols-outlined" aria-hidden="true">check</span></span>
              <span className="stepper-label">1. Film</span>
            </div>
            <div className="stepper-line" aria-hidden="true" />
            <div className="stepper-step completed">
              <span className="stepper-badge"><span className="material-symbols-outlined" aria-hidden="true">check</span></span>
              <span className="stepper-label">2. Showtime</span>
            </div>
            <div className="stepper-line" aria-hidden="true" />
            <div className={`stepper-step ${viewStep === 'review' || confirmation ? 'completed' : 'active'}`}>
              <span className="stepper-badge">
                {viewStep === 'review' || confirmation ? (
                  <span className="material-symbols-outlined" aria-hidden="true">check</span>
                ) : (
                  '3'
                )}
              </span>
              <span className="stepper-label">3. Choose Seats</span>
            </div>
            <div className="stepper-line" aria-hidden="true" />
            <div className={`stepper-step ${confirmation ? 'completed' : viewStep === 'review' ? 'active' : 'pending'}`}>
              <span className="stepper-badge">
                {confirmation ? (
                  <span className="material-symbols-outlined" aria-hidden="true">check</span>
                ) : (
                  '4'
                )}
              </span>
              <span className="stepper-label">4. Review &amp; Confirm</span>
            </div>
          </nav>
        </div>
      </div>

      <div className="seat-selection-heading visually-hidden">
        <span className="section-kicker">{showtime.cinemaName}{showtime.city ? ` · ${showtime.city}` : ''}</span>
        <h3 id="seat-selection-heading">Select your seats</h3>
        {showtime.startsAt && (
          <p>{formatShowtimeDateTime(showtime.startsAt)}{showtime.screenName ? ` · ${showtime.screenName}` : ''}</p>
        )}
      </div>

      {status === 'loading' ? (
        <div className="empty-state showtimes-state" role="status">
          <h3>Loading seat layout...</h3>
          <p>Checking availability for this screening.</p>
        </div>
      ) : status === 'error' ? (
        <div className="empty-state showtimes-state" role="alert">
          <h3>We couldn’t load seats</h3>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={retryLoading}>Try again</button>
        </div>
      ) : seats.length === 0 ? (
        <div className="empty-state showtimes-state">
          <h3>No seat layout available</h3>
          <p>This screening does not have any seats listed.</p>
        </div>
      ) : confirmation ? (
        /* PHASE 5: DIGITAL CINEMA PASS CONFIRMATION */
        <div className="digital-ticket-container" role="status">
          {/* Top Control Bar */}
          <div className="digital-ticket-top-bar">
            <button className="booking-back-link" type="button" onClick={onBack}>
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              <span>Back to Movies</span>
            </button>
            <div className="ticket-meta-badges">
              {confirmation.booking.createdAt && (
                <span className="ticket-issued-pill">
                  Issued: {formatShowtimeDateTime(confirmation.booking.createdAt)}
                </span>
              )}
              <span className="ticket-confirmed-badge">
                <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                <span>RESERVATION CONFIRMED</span>
              </span>
            </div>
          </div>

          {/* Central Luxury Boarding Pass Ticket */}
          <article className="ticket-board-pass booking-confirmation">
            {/* Ambient Lighting Overlay */}
            <div className="ticket-ambient-glow" aria-hidden="true" />

            {/* Left / Main Ticket Body */}
            <div className="ticket-main-body">
              {/* Film Title, Poster & Specs */}
              <div className="ticket-film-header">
                {movie?.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    alt={movie.title || 'Movie Poster'}
                    className="ticket-film-poster"
                  />
                ) : (
                  <div className="ticket-film-poster-placeholder" aria-hidden="true">
                    <span className="material-symbols-outlined">movie</span>
                  </div>
                )}
                <div className="ticket-film-info">
                  <div className="ticket-badges-row">
                    {movie?.language && <span className="ticket-format-badge">{movie.language}</span>}
                    {movie?.durationMinutes && <span className="ticket-spec-badge">{movie.durationMinutes} Min</span>}
                    {showtime.screenName && <span className="ticket-spec-badge">{showtime.screenName}</span>}
                  </div>
                  <h2 className="ticket-film-title">{movie?.title || showtime.movieTitle || 'Exclusive Screening'}</h2>
                  <p className="ticket-film-director">
                    {[movie?.language, movie?.durationMinutes ? `${movie.durationMinutes} min` : '', movie?.releaseDate ? `Released ${formatReleaseDate(movie.releaseDate)}` : ''].filter(Boolean).join(' · ')}
                  </p>
                  {showtime.screenName && (
                    <div className="ticket-audio-spec">
                      <span className="material-symbols-outlined" aria-hidden="true">theater_comedy</span>
                      <span>Auditorium: {showtime.screenName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Venue & Coordinates Grid */}
              <div className="ticket-coords-grid booking-confirmation-details">
                <div className="ticket-coord-item">
                  <span className="coord-label">CINEMA COMPLEX</span>
                  <strong className="coord-value">{showtime.cinemaName}</strong>
                  <span className="coord-sub">{showtime.city || 'Flagship Auditorium'}</span>
                </div>
                <div className="ticket-coord-item">
                  <span className="coord-label">AUDITORIUM</span>
                  <strong className="coord-value primary">{showtime.screenName || 'AUDI 01'}</strong>
                  <span className="coord-sub">Reserved Auditorium Screen</span>
                </div>
                <div className="ticket-coord-item">
                  <span className="coord-label">DATE &amp; SHOWTIME</span>
                  <strong className="coord-value">{formatShowtimeDateTime(showtime.startsAt)}</strong>
                  <span className="coord-sub gold">Doors open 30 mins prior</span>
                </div>
              </div>

              {/* Seating Allocation & Total */}
              <div className="ticket-seating-row">
                <div>
                  <span className="coord-label">ALLOCATED SEATS</span>
                  <div className="ticket-seats-lead">
                    <strong className="ticket-seats-text">
                      {finalConfirmedSeats.length ? finalConfirmedSeats.map(getSeatLabel).join(', ') : 'Seat labels unavailable'}
                    </strong>
                    <span className="ticket-seats-count">({finalConfirmedSeats.length} Admissions)</span>
                  </div>
                  <span className="ticket-tier-text">
                    Reserved Auditorium Seating · Present booking reference for entry
                  </span>
                </div>
                <div className="ticket-total-box">
                  <span className="coord-label">TOTAL REMITTANCE</span>
                  <strong className="ticket-total-price">
                    {Number.isFinite(confirmation.booking.totalAmountInPaise)
                      ? formatTicketPrice(confirmation.booking.totalAmountInPaise)
                      : formatTicketPrice(totalPrice)}
                  </strong>
                  <span className="ticket-tax-note">All taxes and box office charges included in ticket total</span>
                </div>
              </div>
            </div>

            {/* Perforation Separator */}
            <div className="ticket-perforation-sep" aria-hidden="true">
              <div className="notch-cut notch-top" />
              <div className="perforation-line" />
              <div className="notch-cut notch-bottom" />
            </div>

            {/* Right / Scannable Gate Pass Stub */}
            <div className="ticket-stub">
              <div className="stub-header">
                <span className="stub-label">GATE PASS</span>
                <span className="stub-badge">VALID FOR ENTRY</span>
              </div>

              {/* Scannable Vector QR Module (Illustrative) */}
              <div className="ticket-qr-box">
                <svg
                  className="ticket-qr-svg"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label={`Illustrative digital entry pass for booking reference ${confirmation.booking.id}. Present Ref ID for entry.`}
                >
                  <rect fill="currentColor" height="28" rx="2" width="28" x="5" y="5" />
                  <rect fill="#0e0e13" height="20" rx="1" width="20" x="9" y="9" />
                  <rect fill="currentColor" height="12" rx="1" width="12" x="13" y="13" />
                  <rect fill="currentColor" height="28" rx="2" width="28" x="67" y="5" />
                  <rect fill="#0e0e13" height="20" rx="1" width="20" x="71" y="9" />
                  <rect fill="currentColor" height="12" rx="1" width="12" x="75" y="13" />
                  <rect fill="currentColor" height="28" rx="2" width="28" x="5" y="67" />
                  <rect fill="#0e0e13" height="20" rx="1" width="20" x="9" y="71" />
                  <rect fill="currentColor" height="12" rx="1" width="12" x="13" y="75" />
                  <rect fill="currentColor" height="6" width="6" x="38" y="6" />
                  <rect fill="currentColor" height="6" width="6" x="48" y="10" />
                  <rect fill="currentColor" height="6" width="5" x="58" y="6" />
                  <rect fill="currentColor" height="6" width="6" x="38" y="18" />
                  <rect fill="currentColor" height="6" width="7" x="48" y="24" />
                  <rect fill="currentColor" height="6" width="6" x="10" y="38" />
                  <rect fill="currentColor" height="6" width="6" x="20" y="44" />
                  <rect fill="currentColor" height="6" width="6" x="28" y="38" />
                  <rect fill="currentColor" height="6" width="6" x="38" y="38" />
                  <rect fill="#c93b4e" height="8" width="8" x="48" y="36" />
                  <rect fill="currentColor" height="6" width="6" x="62" y="38" />
                  <rect fill="currentColor" height="6" width="6" x="72" y="42" />
                  <rect fill="currentColor" height="6" width="6" x="84" y="38" />
                  <rect fill="currentColor" height="8" width="6" x="38" y="48" />
                  <rect fill="currentColor" height="6" width="8" x="50" y="50" />
                  <rect fill="currentColor" height="6" width="6" x="64" y="48" />
                  <rect fill="currentColor" height="6" width="6" x="78" y="52" />
                  <rect fill="currentColor" height="6" width="6" x="38" y="62" />
                  <rect fill="currentColor" height="6" width="8" x="48" y="68" />
                  <rect fill="currentColor" height="6" width="6" x="62" y="62" />
                  <rect fill="currentColor" height="8" width="6" x="74" y="68" />
                  <rect fill="currentColor" height="6" width="6" x="86" y="62" />
                  <rect fill="currentColor" height="6" width="6" x="38" y="76" />
                  <rect fill="currentColor" height="8" width="6" x="52" y="80" />
                  <rect fill="currentColor" height="6" width="8" x="66" y="78" />
                  <rect fill="currentColor" height="6" width="6" x="80" y="82" />
                  <rect fill="currentColor" height="6" width="6" x="42" y="88" />
                  <rect fill="currentColor" height="6" width="6" x="70" y="88" />
                </svg>
                <span className="stub-scan-caption">
                  Admit {finalConfirmedSeats.length} · Present Ref ID at Concierge
                </span>
                <small className="stub-watermark" style={{ fontSize: '10px', color: '#8f8b95' }}>
                  (Illustrative Digital Entry Pass)
                </small>
              </div>

              {/* Pass ID Reference */}
              <div className="stub-ref-box">
                <span className="booking-reference stub-ref-id">
                  Ref: <strong>{confirmation.booking.id}</strong>
                </span>
                <span className="stub-watermark">Cinevo Verified Pass</span>
              </div>

              <div className="stub-service-indicator">
                <span className="material-symbols-outlined" aria-hidden="true">room_service</span>
                <span>In-Seat Attendant Privileges Included</span>
              </div>
            </div>
          </article>

          {/* Ticket Utilities & Wallet Export Actions Bar */}
          <div className="ticket-actions-bar">
            <div className="ticket-actions-left">
              <button
                className="primary-button ticket-view-bookings-btn"
                type="button"
                onClick={() => { window.location.hash = '#bookings' }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">confirmation_number</span>
                <span>View My Bookings</span>
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => window.print()}
              >
                <span className="material-symbols-outlined" aria-hidden="true">print</span>
                <span>Print / Save Pass</span>
              </button>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={onBack}
            >
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
              <span>Return to Movies</span>
            </button>
          </div>
        </div>
      ) : viewStep === 'review' ? (
        /* PHASE 5: BOOKING REVIEW SCREEN */
        <div className="booking-review-container">
          <div className="booking-review-layout">
            {/* Left Primary Column: Film Details, Venue, Seats, Patron Liaison & Screening Protocols */}
            <div className="review-primary-col">
              {/* SECTION A: Cinema & Film Details Card */}
              <div className="review-card review-film-card">
                <div className="review-ambient-glow" aria-hidden="true" />
                <div className="review-film-header">
                  {movie?.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title || 'Movie Poster'}
                      className="review-poster"
                    />
                  ) : (
                    <div className="review-poster-placeholder" aria-hidden="true">
                      <span className="material-symbols-outlined">movie</span>
                    </div>
                  )}
                  <div className="review-film-meta">
                    <div className="review-pill-row">
                      {movie?.language && <span className="review-pill format">{movie.language}</span>}
                      {movie?.durationMinutes && <span className="review-pill cert">{movie.durationMinutes} Min</span>}
                      {showtime.screenName && <span className="review-pill genre">{showtime.screenName}</span>}
                    </div>
                    <h2 className="review-film-title">{movie?.title || showtime.movieTitle || 'Exclusive Screening'}</h2>
                    <p className="review-film-synopsis">
                      {movie?.description ? movie.description.slice(0, 160) + (movie.description.length > 160 ? '…' : '') : 'Experience this cinematic presentation in our private screening auditorium.'}
                    </p>
                    <div className="review-specs-ribbon">
                      {showtime.screenName && (
                        <span className="review-spec-chip">
                          <span className="material-symbols-outlined gold" aria-hidden="true">tv</span>
                          <span>{showtime.screenName}</span>
                        </span>
                      )}
                      {movie?.durationMinutes && (
                        <span className="review-spec-chip">
                          <span className="material-symbols-outlined crimson" aria-hidden="true">schedule</span>
                          <span>{movie.durationMinutes} Minutes</span>
                        </span>
                      )}
                      {movie?.language && (
                        <span className="review-spec-chip">
                          <span className="material-symbols-outlined gold" aria-hidden="true">translate</span>
                          <span>{movie.language}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Structured Venue & Showtime Grid */}
                <div className="review-venue-grid">
                  <div className="review-venue-card">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">theater_comedy</span>
                    <div>
                      <span className="coord-label">VENUE &amp; AUDITORIUM</span>
                      <strong className="coord-value">{showtime.cinemaName}</strong>
                      <span className="coord-sub">{showtime.screenName || 'Audi 01'}{showtime.city ? ` · ${showtime.city}` : ''}</span>
                    </div>
                  </div>
                  <div className="review-venue-card">
                    <span className="material-symbols-outlined gold" aria-hidden="true">schedule</span>
                    <div>
                      <span className="coord-label">DATE &amp; SHOWTIME</span>
                      <strong className="coord-value">{formatShowtimeDateTime(showtime.startsAt)}</strong>
                      <span className="coord-sub">Doors open 30 mins prior</span>
                    </div>
                  </div>
                </div>

                {/* Allocated Seats Ribbon */}
                <div className="review-allocated-ribbon">
                  <div className="review-seats-display">
                    <div className="review-seat-icon-box" aria-hidden="true">
                      <span className="material-symbols-outlined">airline_seat_recline_extra</span>
                    </div>
                    <div>
                      <span className="coord-label">ALLOCATED SEATS</span>
                      <h4 className="review-seats-headline">
                        Seats: <span className="crimson">{selectedSeats.map(getSeatLabel).join(', ')}</span> ({selectedSeats.length} {selectedSeats.length === 1 ? 'ticket' : 'tickets'})
                      </h4>
                      <p className="review-seats-tier-sub">
                        Royale Recliner / Premium Lounger Seating
                      </p>
                    </div>
                  </div>
                  <button
                    className="review-change-seats-btn"
                    type="button"
                    onClick={() => setViewStep('seats')}
                  >
                    <span>Change Seats</span>
                    <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                  </button>
                </div>
              </div>

              {/* SECTION B: Patron Liaison & Ticket Delivery */}
              <div className="review-card">
                <div className="review-card-heading">
                  <div className="review-heading-group">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">badge</span>
                    <h3>Patron Liaison &amp; Ticket Delivery</h3>
                  </div>
                  <span className="vip-status-badge">
                    <span className="material-symbols-outlined gold" aria-hidden="true">stars</span>
                    <span>Royale Club Member</span>
                  </span>
                </div>
                <div className="review-patron-grid">
                  <div className="review-patron-card">
                    <span className="coord-label">PRIMARY PATRON</span>
                    <strong className="coord-value">{authSession?.user?.name || 'Valued Patron'}</strong>
                    <span className="coord-sub gold">Verified Account</span>
                  </div>
                  <div className="review-patron-card">
                    <span className="coord-label">VERIFIED EMAIL</span>
                    <strong className="coord-value truncate">{authSession?.user?.email || 'Registered User'}</strong>
                    <span className="coord-sub">Instant E-Ticket Dispatch</span>
                  </div>
                  <div className="review-patron-card">
                    <span className="coord-label">PASS DELIVERY</span>
                    <strong className="coord-value">Digital Entry Pass</strong>
                    <span className="coord-sub">Present Ref ID at Foyer</span>
                  </div>
                </div>
                <div className="review-delivery-note">
                  <span className="material-symbols-outlined crimson" aria-hidden="true">qr_code_scanner</span>
                  <p>
                    Instant contactless digital cinema pass with booking confirmation reference will be generated immediately upon completing checkout.
                  </p>
                </div>
              </div>

              {/* SECTION C: Screening Protocols & Admission Charter */}
              <div className="review-card">
                <div className="review-card-heading">
                  <div className="review-heading-group">
                    <span className="material-symbols-outlined" aria-hidden="true">policy</span>
                    <h3>Screening Protocols &amp; Privileges</h3>
                  </div>
                </div>
                <div className="review-protocol-list">
                  <div className="review-protocol-item">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">verified_user</span>
                    <div>
                      <strong className="protocol-title">Admission &amp; Verification:</strong>
                      <span> Present your booking reference ID at the foyer reception desk for reservation verification prior to seating.</span>
                    </div>
                  </div>
                  <div className="review-protocol-item">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">spatial_audio_off</span>
                    <div>
                      <strong className="protocol-title">Acoustic Immersion:</strong>
                      <span> Screening features calibrated auditorium acoustics adjusted to optimal cinema presentation levels.</span>
                    </div>
                  </div>
                  <div className="review-protocol-item">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">room_service</span>
                    <div>
                      <strong className="protocol-title">Lounger Privileges:</strong>
                      <span> Reservation includes allocated auditorium seating, priority admission, and concierge service where available.</span>
                    </div>
                  </div>
                  <div className="review-protocol-item">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">lock_clock</span>
                    <div>
                      <strong className="protocol-title">Reservation Integrity:</strong>
                      <span> Allocated seats {selectedSeats.map(getSeatLabel).join(', ')} are locked for your order upon confirmation. Active bookings can be reviewed or cancelled anytime via My Bookings.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Secondary Column: Sticky Order Summary & Confirmation CTA */}
            <div className="review-secondary-col">
              <div className="review-card review-summary-card">
                <div className="review-summary-header">
                  <h3>Order Summary</h3>
                  <span className="review-encrypted-badge">
                    <span className="material-symbols-outlined gold" aria-hidden="true">lock</span>
                    <span>256-Bit Encrypted</span>
                  </span>
                </div>

                <div className="review-price-list">
                  <div className="review-price-row">
                    <div>
                      <strong className="price-item-name">{selectedSeats.length} × Cinema Admissions</strong>
                      <span className="coord-sub">{selectedSeats.map(getSeatLabel).join(', ')} · {Number.isFinite(ticketPrice) ? formatTicketPrice(ticketPrice) : '—'} each</span>
                    </div>
                    <strong className="price-item-val font-mono">
                      {totalPrice === null ? '—' : formatTicketPrice(totalPrice)}
                    </strong>
                  </div>

                  <div className="review-grand-total">
                    <div>
                      <span className="total-lead-text">Total Payable</span>
                      <span className="coord-sub">All taxes and box office charges included in ticket total</span>
                    </div>
                    <strong className="review-total-amount font-mono">
                      {totalPrice === null ? 'Price unavailable' : formatTicketPrice(totalPrice)}
                    </strong>
                  </div>
                </div>

                {/* Primary Action CTA */}
                <div className="review-actions-box">
                  <button
                    className="primary-button booking-submit-button booking-confirm-submit-button"
                    type="button"
                    disabled={selectedSeatIds.size === 0 || bookingStatus === 'loading'}
                    onClick={submitBooking}
                  >
                    <span>
                      {bookingStatus === 'loading'
                        ? 'Confirming Booking...'
                        : `Confirm Booking · ${formatTicketPrice(totalPrice)}`}
                    </span>
                    <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                  </button>
                  <small className="review-guarantee-note">
                    Instant scannable digital entry pass allocated upon confirmation.
                  </small>
                </div>

                {bookingError && (
                  <div className="notice booking-error" role="alert">
                    <p>{bookingError}</p>
                    <button
                      className="secondary-button"
                      type="button"
                      style={{ marginTop: '8px', fontSize: '11px', padding: '6px 12px' }}
                      onClick={() => setViewStep('seats')}
                    >
                      Re-select Seats
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PHASE 4 & 5: SEAT SELECTION ARENA */
        <div className="seat-selection-arena">
          {/* Left Stage: Seat Map */}
          <div className="seat-map-panel">
            {/* Curved Cinema Screen Graphic */}
            <div className="curved-screen-stage">
              <div className="projector-glow" aria-hidden="true" />
              <svg className="screen-curve-svg" fill="none" preserveAspectRatio="none" viewBox="0 0 800 64" aria-hidden="true">
                <path d="M 20 54 Q 400 6 780 54" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
                <path d="M 40 56 Q 400 14 760 56" stroke="rgba(255,255,255,0.18)" strokeDasharray="4 6" strokeWidth="1" />
              </svg>
              <div className="screen-caption">
                <span className="material-symbols-outlined" aria-hidden="true">videocam</span>
                <span>All Eyes Forward · Curved Screen Projection{showtime.screenName ? ` · ${showtime.screenName}` : ''}</span>
              </div>
            </div>

            {/* Accessible Status Legend */}
            <div className="seat-legend" aria-label="Seat availability legend">
              <div className="legend-item">
                <span className="seat-legend-icon available" aria-hidden="true">1</span>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <span className="seat-legend-icon selected" aria-hidden="true">
                  <span className="material-symbols-outlined">check</span>
                </span>
                <span>Selected</span>
              </div>
              <div className="legend-item">
                <span className="seat-legend-icon unavailable" aria-hidden="true">
                  <span className="material-symbols-outlined">close</span>
                </span>
                <span>Occupied</span>
              </div>
              <div className="legend-item">
                <span className="seat-legend-icon premium" aria-hidden="true">
                  <span className="material-symbols-outlined">workspace_premium</span>
                </span>
                <span>Premium / Recliner</span>
              </div>
            </div>

            {/* Seating Grid */}
            <div className="seat-rows-viewport" id="seatMapViewport">
              <div className="seat-rows">
                {[...seatsByRow.entries()].map(([rowLabel, rowSeats]) => {
                  const hasSelectedInRow = rowSeats.some((s) => selectedSeatIds.has(s.id))
                  return (
                    <div className="seat-row" key={rowLabel}>
                      <span className={`seat-row-label ${hasSelectedInRow ? 'active' : ''}`}>{rowLabel}</span>
                      <div className="seat-row-items">
                        {rowSeats.map((seat) => {
                          const isSelected = selectedSeatIds.has(seat.id)
                          const isAvailable = seat.status === 'available'
                          const isRecliner = Boolean(seat.seatType && /recliner/i.test(seat.seatType))
                          const isPremium = Boolean(seat.seatType && /premium|vip/i.test(seat.seatType))
                          const selectionLimitReached = !isSelected &&
                            selectedSeatIds.size >= MAX_BOOKING_SEATS

                          let seatClass = 'seat-button'
                          if (isSelected) {
                            seatClass += ' selected'
                          } else if (isAvailable) {
                            seatClass += ' available'
                            if (isRecliner) seatClass += ' recliner'
                            else if (isPremium) seatClass += ' premium'
                            if (selectionLimitReached) seatClass += ' limit-reached'
                          } else {
                            seatClass += ' unavailable'
                          }

                          return (
                            <button
                              className={seatClass}
                              key={seat.id}
                              type="button"
                              disabled={!isAvailable || selectionLimitReached}
                              aria-pressed={isSelected}
                              aria-label={`Seat ${getSeatLabel(seat)}, ${isAvailable ? (isSelected ? 'selected' : selectionLimitReached ? 'available, booking limit reached' : 'available') : 'unavailable'}, ${seat.seatType}`}
                              title={`${getSeatLabel(seat)} · ${seat.seatType}`}
                              onClick={() => toggleSeat(seat)}
                            >
                              <span className="seat-cushion" aria-hidden="true" />
                              <span className="seat-inner-content">
                                {isSelected ? (
                                  <span className="material-symbols-outlined seat-glyph" aria-hidden="true">check</span>
                                ) : !isAvailable ? (
                                  <span className="material-symbols-outlined seat-glyph" aria-hidden="true">close</span>
                                ) : null}
                                <span className="seat-number-text">{seat.seatNumber}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <span className={`seat-row-label ${hasSelectedInRow ? 'active' : ''}`}>{rowLabel}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Hall Guidance & Advisory Drawer */}
            <div className="seating-advisory-drawer">
              <div className="advisory-message">
                <span className="material-symbols-outlined" aria-hidden="true">policy</span>
                <div>
                  <h4>Continuous Seating Optimization</h4>
                  <p>Maximum {MAX_BOOKING_SEATS} seats per reservation. Best viewing angles in central clusters.</p>
                </div>
              </div>
              <div className="advisory-badge">
                <span className="material-symbols-outlined" aria-hidden="true">verified</span>
                <span>Direct Confirmation</span>
              </div>
            </div>
          </div>

          {/* Right Rail: Booking Summary */}
          <aside className="booking-summary-rail" aria-live="polite" aria-label="Current booking summary">
            <div className="rail-header">
              <div>
                <span className="section-kicker">BOOKING DETAILS</span>
                <h3 className="rail-title">Ticket Summary</h3>
              </div>
              <span className="rail-count-badge">
                {selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'} Selected
              </span>
            </div>

            {/* Movie & Hall Mini Dossier */}
            <div className="rail-dossier">
              {movie?.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.title || 'Movie Poster'}
                  className="rail-dossier-poster"
                />
              ) : (
                <div className="rail-dossier-poster-placeholder" aria-hidden="true">
                  <span className="material-symbols-outlined">movie</span>
                </div>
              )}
              <div className="rail-dossier-info">
                <h4 className="rail-movie-title">{movie?.title || showtime.movieTitle || 'Exclusive Screening'}</h4>
                <span className="rail-movie-format">{showtime.screenName || 'Main Auditorium'}</span>
                <p className="rail-movie-cinema">{showtime.cinemaName}{showtime.city ? ` · ${showtime.city}` : ''}</p>
              </div>
            </div>

            {/* Showtime Schedule Grid */}
            <div className="rail-schedule-grid">
              <div className="rail-schedule-item">
                <span className="rail-schedule-label">SHOWTIME</span>
                <span className="rail-schedule-value">{formatShowtimeDateTime(showtime.startsAt)}</span>
              </div>
            </div>

            {/* Allocated Seats Listing with Remove Actions */}
            <div className="rail-seats-section">
              <div className="rail-seats-header">
                <span className="section-kicker">ALLOCATED SEATS</span>
                {selectedSeats.length >= MAX_BOOKING_SEATS && (
                  <span className="rail-limit-notice">Max {MAX_BOOKING_SEATS} reached</span>
                )}
              </div>

              {selectedSeats.length === 0 ? (
                <div className="rail-empty-seats">
                  <span className="material-symbols-outlined" aria-hidden="true">chair</span>
                  <p>No seats selected</p>
                  <small>Choose up to {MAX_BOOKING_SEATS} seats on the auditorium map.</small>
                </div>
              ) : (
                <div className="rail-seat-list">
                  {selectedSeats.map((seat) => (
                    <div className="rail-seat-item" key={seat.id}>
                      <div className="rail-seat-badge-group">
                        <span className={`rail-seat-tag ${/premium|recliner/i.test(seat.seatType) ? 'premium' : ''}`}>
                          {getSeatLabel(seat)}
                        </span>
                        <div className="rail-seat-meta">
                          <span className="rail-seat-tier">
                            {seat.seatType === 'recliner' ? 'Royale Recliner' : seat.seatType === 'premium' ? 'Premium Lounger' : 'Standard Seat'}
                          </span>
                          <span className="rail-seat-coord">Row {seat.rowLabel} · Seat {seat.seatNumber}</span>
                        </div>
                      </div>
                      <div className="rail-seat-item-right">
                        <span className="rail-seat-price">
                          {Number.isFinite(ticketPrice) ? formatTicketPrice(ticketPrice) : '—'}
                        </span>
                        <button
                          type="button"
                          className="rail-seat-remove"
                          onClick={() => toggleSeat(seat)}
                          title={`Deselect seat ${getSeatLabel(seat)}`}
                          aria-label={`Deselect seat ${getSeatLabel(seat)}`}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="rail-price-breakdown">
              <div className="price-row">
                <span className="price-label">Admissions Subtotal ({selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'})</span>
                <span className="price-value font-mono">
                  {totalPrice === null ? 'Price unavailable' : formatTicketPrice(totalPrice)}
                </span>
              </div>
              <div className="price-row total-row">
                <span className="total-label">Total Payable</span>
                <strong className="total-amount font-mono">
                  {totalPrice === null ? 'Price unavailable' : formatTicketPrice(totalPrice)}
                </strong>
              </div>
              <span className="ticket-tax-note" style={{ fontSize: '11px', color: '#8f8b95', marginTop: '6px', display: 'block' }}>
                All taxes and box office charges included in ticket total
              </span>
            </div>

            {/* Action CTA: Advance to Review */}
            <div className="rail-actions">
              <button
                className="primary-button booking-submit-button"
                type="button"
                disabled={selectedSeatIds.size === 0 || bookingStatus === 'loading'}
                onClick={() => {
                  if (!authSession) {
                    setShowAuthForm(true)
                    setAuthError('Sign in or create an account before reviewing your reservation.')
                    return
                  }
                  setViewStep('review')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                <span>
                  {selectedSeatIds.size === 0
                    ? 'Select Seats to Continue'
                    : `Continue to Review · ${formatTicketPrice(totalPrice)}`}
                </span>
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </button>
              <small className="rail-guarantee-note">
                Review ticket breakdown and patron credentials in the next step.
              </small>
            </div>

            {bookingError && <div className="notice booking-error" role="alert">{bookingError}</div>}
            {!authSession && showAuthForm && (
              <AuthForm
                key={authError}
                onAuthenticated={(session) => {
                  onAuthenticated(session)
                  setAuthError('')
                  setShowAuthForm(false)
                  setViewStep('review')
                }}
                message={authError}
              />
            )}
          </aside>
        </div>
      )}
    </section>
  )
}

function getMovieIdFromHash() {
  const match = window.location.hash.match(/^#movie\/(.+)$/)
  if (!match) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function getAuthModeFromHash() {
  if (window.location.hash === '#signin') return 'login'
  if (window.location.hash === '#register') return 'register'
  return null
}

function validateMovieForm(form) {
  const errors = {}
  const title = form.title.trim()
  const language = form.language.trim()
  const duration = Number(form.durationMinutes)

  if (!title) errors.title = 'Enter a movie title.'
  else if (title.length > 200) errors.title = 'Title must be 200 characters or fewer.'

  if (!form.durationMinutes || !Number.isInteger(duration) || duration <= 0 || duration > 1000) {
    errors.durationMinutes = 'Duration must be a positive whole number between 1 and 1,000 minutes.'
  }

  if (!language) errors.language = 'Enter the movie language.'
  else if (language.length > 50) errors.language = 'Language must be 50 characters or fewer.'

  if (form.releaseDate) {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(form.releaseDate)
    const date = dateMatch ? new Date(`${form.releaseDate}T00:00:00.000Z`) : null
    if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== form.releaseDate) {
      errors.releaseDate = 'Enter a valid release date.'
    }
  }

  if (form.posterUrl.trim()) {
    try {
      new URL(form.posterUrl.trim())
    } catch {
      errors.posterUrl = 'Enter a valid poster URL.'
    }
  }

  return errors
}

function AddMovieForm({ token, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    durationMinutes: '',
    language: '',
    description: '',
    releaseDate: '',
    posterUrl: '',
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [apiError, setApiError] = useState('')
  const [createdTitle, setCreatedTitle] = useState('')
  const submissionInFlight = useRef(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setApiError('')
    setStatus((current) => current === 'error' ? 'idle' : current)
  }

  async function submitMovie(event) {
    event.preventDefault()
    if (submissionInFlight.current) return

    const validationErrors = validateMovieForm(form)
    setErrors(validationErrors)
    setApiError('')
    setCreatedTitle('')

    if (Object.keys(validationErrors).length) {
      setStatus('idle')
      return
    }

    setStatus('loading')

    const payload = {
      title: form.title.trim(),
      durationMinutes: Number(form.durationMinutes),
      language: form.language.trim(),
    }
    if (form.description.trim()) payload.description = form.description.trim()
    if (form.releaseDate) payload.releaseDate = form.releaseDate
    if (form.posterUrl.trim()) payload.posterUrl = form.posterUrl.trim()

    submissionInFlight.current = true
    try {
      const createdMovie = await createDashboardMovie(payload, token)
      onCreated(createdMovie)
      setCreatedTitle(createdMovie.title)
      setForm({
        title: '',
        durationMinutes: '',
        language: '',
        description: '',
        releaseDate: '',
        posterUrl: '',
      })
      setStatus('success')
    } catch (error) {
      setApiError(error.message || 'Unable to create the movie.')
      setStatus('error')
    } finally {
      submissionInFlight.current = false
    }
  }

  return (
    <form className="admin-movie-form" noValidate onSubmit={submitMovie}>
      <h3>Add Movie</h3>
      <p className="admin-form-intro">Add a movie to the catalog. Fields marked required must be completed.</p>
      <div className="admin-form-grid">
        <label className="admin-form-field">
          <span>Title <span aria-hidden="true">*</span></span>
          <input name="title" value={form.title} onChange={updateField} maxLength={200} required aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'admin-movie-title-error' : undefined} />
          {errors.title && <small id="admin-movie-title-error" className="admin-field-error">{errors.title}</small>}
        </label>
        <label className="admin-form-field">
          <span>Duration (minutes) <span aria-hidden="true">*</span></span>
          <input name="durationMinutes" type="number" min="1" max="1000" step="1" value={form.durationMinutes} onChange={updateField} required aria-invalid={Boolean(errors.durationMinutes)} aria-describedby={errors.durationMinutes ? 'admin-movie-duration-error' : undefined} />
          {errors.durationMinutes && <small id="admin-movie-duration-error" className="admin-field-error">{errors.durationMinutes}</small>}
        </label>
        <label className="admin-form-field">
          <span>Language <span aria-hidden="true">*</span></span>
          <input name="language" value={form.language} onChange={updateField} maxLength={50} required aria-invalid={Boolean(errors.language)} aria-describedby={errors.language ? 'admin-movie-language-error' : undefined} />
          {errors.language && <small id="admin-movie-language-error" className="admin-field-error">{errors.language}</small>}
        </label>
        <label className="admin-form-field">
          <span>Release date</span>
          <input name="releaseDate" type="date" value={form.releaseDate} onChange={updateField} aria-invalid={Boolean(errors.releaseDate)} aria-describedby={errors.releaseDate ? 'admin-movie-date-error' : undefined} />
          {errors.releaseDate && <small id="admin-movie-date-error" className="admin-field-error">{errors.releaseDate}</small>}
        </label>
        <label className="admin-form-field admin-form-wide">
          <span>Poster URL</span>
          <input name="posterUrl" type="url" value={form.posterUrl} onChange={updateField} aria-invalid={Boolean(errors.posterUrl)} aria-describedby={errors.posterUrl ? 'admin-movie-poster-error' : undefined} />
          {errors.posterUrl && <small id="admin-movie-poster-error" className="admin-field-error">{errors.posterUrl}</small>}
        </label>
        <label className="admin-form-field admin-form-wide">
          <span>Description</span>
          <textarea name="description" value={form.description} onChange={updateField} rows="3" />
        </label>
      </div>
      {apiError && <p className="admin-form-error" role="alert">{apiError}</p>}
      {status === 'success' && <p className="admin-form-success" role="status">“{createdTitle}” was added to the movie catalog.</p>}
      <button className="primary-button admin-submit-button" type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Adding movie...' : 'Add Movie'}
      </button>
    </form>
  )
}

function validateCinemaForm(form) {
  const errors = {}
  const name = form.name.trim()
  const address = form.address.trim()
  const city = form.city.trim()
  const state = form.state.trim()
  const postalCode = form.postalCode.trim()

  if (!name) errors.name = 'Enter a cinema name.'
  else if (name.length > 200) errors.name = 'Name must be 200 characters or fewer.'
  if (!address) errors.address = 'Enter an address.'
  if (!city) errors.city = 'Enter a city.'
  else if (city.length > 100) errors.city = 'City must be 100 characters or fewer.'
  if (!state) errors.state = 'Enter a state.'
  else if (state.length > 100) errors.state = 'State must be 100 characters or fewer.'
  if (postalCode.length > 10) errors.postalCode = 'Postal code must be 10 characters or fewer.'

  return errors
}

function AddCinemaForm({ token, onCreated }) {
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', postalCode: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [apiError, setApiError] = useState('')
  const [createdName, setCreatedName] = useState('')
  const submissionInFlight = useRef(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setApiError('')
    setStatus((current) => current === 'error' ? 'idle' : current)
  }

  async function submitCinema(event) {
    event.preventDefault()
    if (submissionInFlight.current) return

    const validationErrors = validateCinemaForm(form)
    setErrors(validationErrors)
    setApiError('')
    setCreatedName('')
    if (Object.keys(validationErrors).length) {
      setStatus('idle')
      return
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
    }
    if (form.postalCode.trim()) payload.postalCode = form.postalCode.trim()

    submissionInFlight.current = true
    setStatus('loading')
    try {
      const createdCinema = await createDashboardCinema(payload, token)
      setCreatedName(createdCinema.name)
      setForm({ name: '', address: '', city: '', state: '', postalCode: '' })
      setStatus('success')
      onCreated(createdCinema)
    } catch (error) {
      setApiError(error.message || 'Unable to create the cinema.')
      setStatus('error')
    } finally {
      submissionInFlight.current = false
    }
  }

  return (
    <form className="admin-movie-form" noValidate onSubmit={submitCinema}>
      <h3>Add Cinema</h3>
      <p className="admin-form-intro">Add a cinema location. Fields marked required must be completed.</p>
      <div className="admin-form-grid">
        <label className="admin-form-field">
          <span>Name <span aria-hidden="true">*</span></span>
          <input name="name" value={form.name} onChange={updateField} maxLength={200} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'admin-cinema-name-error' : undefined} />
          {errors.name && <small id="admin-cinema-name-error" className="admin-field-error">{errors.name}</small>}
        </label>
        <label className="admin-form-field">
          <span>Address <span aria-hidden="true">*</span></span>
          <input name="address" value={form.address} onChange={updateField} required aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? 'admin-cinema-address-error' : undefined} />
          {errors.address && <small id="admin-cinema-address-error" className="admin-field-error">{errors.address}</small>}
        </label>
        <label className="admin-form-field">
          <span>City <span aria-hidden="true">*</span></span>
          <input name="city" value={form.city} onChange={updateField} maxLength={100} required aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'admin-cinema-city-error' : undefined} />
          {errors.city && <small id="admin-cinema-city-error" className="admin-field-error">{errors.city}</small>}
        </label>
        <label className="admin-form-field">
          <span>State <span aria-hidden="true">*</span></span>
          <input name="state" value={form.state} onChange={updateField} maxLength={100} required aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? 'admin-cinema-state-error' : undefined} />
          {errors.state && <small id="admin-cinema-state-error" className="admin-field-error">{errors.state}</small>}
        </label>
        <label className="admin-form-field">
          <span>Postal code</span>
          <input name="postalCode" value={form.postalCode} onChange={updateField} maxLength={10} aria-invalid={Boolean(errors.postalCode)} aria-describedby={errors.postalCode ? 'admin-cinema-postal-error' : undefined} />
          {errors.postalCode && <small id="admin-cinema-postal-error" className="admin-field-error">{errors.postalCode}</small>}
        </label>
      </div>
      {apiError && <p className="admin-form-error" role="alert">{apiError}</p>}
      {status === 'success' && <p className="admin-form-success" role="status">“{createdName}” was added to the cinema list. Refreshing the list…</p>}
      <button className="primary-button admin-submit-button" type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Adding cinema...' : 'Add Cinema'}
      </button>
    </form>
  )
}

function ScreenManagementSection({ token, screensCreatedThisSession, setScreensCreatedThisSession }) {
  const [cinemas, setCinemas] = useState([])
  const [cinemaStatus, setCinemaStatus] = useState('loading')
  const [cinemaError, setCinemaError] = useState('')
  const [cinemaLoadAttempt, setCinemaLoadAttempt] = useState(0)
  const [screenForm, setScreenForm] = useState({ cinemaId: '', name: '', totalSeats: '' })
  const [screenErrors, setScreenErrors] = useState({})
  const [screenStatus, setScreenStatus] = useState('idle')
  const [screenError, setScreenError] = useState('')
  const [selectedScreenId, setSelectedScreenId] = useState('')
  const [seatForm, setSeatForm] = useState({ rows: '', seatsPerRow: '', seatType: 'regular' })
  const [seatErrors, setSeatErrors] = useState({})
  const [seatStatus, setSeatStatus] = useState('idle')
  const [seatError, setSeatError] = useState('')
  const [seatSuccess, setSeatSuccess] = useState('')
  const [confirmSeatWrite, setConfirmSeatWrite] = useState(false)
  const screenRequestInFlight = useRef(false)
  const seatRequestInFlight = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getDashboardCinemas({ signal: controller.signal })
      .then((loadedCinemas) => {
        setCinemas(loadedCinemas)
        setCinemaStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setCinemaError(error.message || 'Unable to load cinemas for the screen form.')
        setCinemaStatus('error')
      })

    return () => controller.abort()
  }, [cinemaLoadAttempt])

  const selectedScreen = screensCreatedThisSession.find((screen) => screen.id === selectedScreenId)

  function retryCinemaLoad() {
    setCinemaError('')
    setCinemaStatus('loading')
    setCinemaLoadAttempt((attempt) => attempt + 1)
  }

  async function submitScreen(event) {
    event.preventDefault()
    if (screenRequestInFlight.current) return

    const errors = {}
    const name = screenForm.name.trim()
    const totalSeats = Number(screenForm.totalSeats)
    if (!screenForm.cinemaId || !cinemas.some((cinema) => cinema.id === screenForm.cinemaId)) {
      errors.cinemaId = 'Select a cinema from the list.'
    }
    if (!name) errors.name = 'Enter a screen name.'
    else if (name.length > 100) errors.name = 'Screen name must be 100 characters or fewer.'
    if (!screenForm.totalSeats || !Number.isInteger(totalSeats) || totalSeats <= 0 || totalSeats > 1000) {
      errors.totalSeats = 'Total seats must be a positive whole number between 1 and 1,000.'
    }
    setScreenErrors(errors)
    setScreenError('')
    if (Object.keys(errors).length) {
      setScreenStatus('idle')
      return
    }

    screenRequestInFlight.current = true
    setScreenStatus('loading')
    try {
      const screen = await createDashboardScreen({
        cinemaId: screenForm.cinemaId,
        name,
        totalSeats,
      }, token)
      const createdScreen = {
        ...screen,
        totalSeats,
        cinemaId: screenForm.cinemaId,
        cinemaName: cinemas.find((cinema) => cinema.id === screenForm.cinemaId)?.name || '',
      }
      setScreensCreatedThisSession((current) => [
        createdScreen,
        ...current.filter((item) => item.id !== createdScreen.id),
      ])
      setSelectedScreenId(createdScreen.id)
      setScreenForm({ cinemaId: screenForm.cinemaId, name: '', totalSeats: '' })
      setScreenStatus('success')
      setSeatForm({ rows: '', seatsPerRow: '', seatType: 'regular' })
      setSeatErrors({})
      setSeatError('')
      setSeatSuccess('')
      setConfirmSeatWrite(false)
    } catch (error) {
      setScreenError(error.message || 'Unable to create the screen.')
      setScreenStatus('error')
    } finally {
      screenRequestInFlight.current = false
    }
  }

  async function submitSeatGeneration(event) {
    event.preventDefault()
    if (seatRequestInFlight.current || !selectedScreen || selectedScreen.seatsGenerated) return

    const rows = Number(seatForm.rows)
    const seatsPerRow = Number(seatForm.seatsPerRow)
    const errors = {}
    if (!Number.isInteger(rows) || rows < 1 || rows > 10) {
      errors.rows = 'Rows must be a whole number from 1 to 10.'
    }
    if (!Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > 12) {
      errors.seatsPerRow = 'Seats per row must be a whole number from 1 to 12.'
    }
    if (
      Number.isInteger(rows) && Number.isInteger(seatsPerRow) &&
      rows >= 1 && rows <= 10 && seatsPerRow >= 1 && seatsPerRow <= 12 &&
      rows * seatsPerRow > selectedScreen.totalSeats
    ) {
      errors.layout = `This layout exceeds the screen capacity of ${selectedScreen.totalSeats} seats.`
    }
    if (!confirmSeatWrite) errors.confirmation = 'Confirm that you want to write these seat records.'
    setSeatErrors(errors)
    setSeatError('')
    setSeatSuccess('')
    if (Object.keys(errors).length) {
      setSeatStatus('idle')
      return
    }

    seatRequestInFlight.current = true
    setSeatStatus('loading')
    try {
      const result = await generateDashboardSeats(selectedScreen.id, {
        rows,
        seatsPerRow,
        seatType: seatForm.seatType,
      }, token)
      setSeatSuccess(`${result.totalSeats} seat records generated for ${selectedScreen.name}.`)
      setSeatStatus('success')
      setScreensCreatedThisSession((current) => current.map((screen) =>
        screen.id === selectedScreen.id ? { ...screen, seatsGenerated: true } : screen,
      ))
    } catch (error) {
      setSeatError(error.message || 'Unable to generate seats.')
      setSeatStatus('error')
    } finally {
      seatRequestInFlight.current = false
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <span className="section-kicker">CATALOG</span>
          <div className="admin-title-row">
            <span className="material-symbols-outlined admin-title-icon crimson" aria-hidden="true">tv</span>
            <h2>Screens</h2>
          </div>
          <p>Create screens and generate their seat layout.</p>
        </div>
      </div>
      <p className="admin-capability">No screen-list endpoint exists. Screens below are only those created during this dashboard session and are not restored after reload.</p>
      <form className="admin-movie-form" noValidate onSubmit={submitScreen}>
        <h3>Create Screen</h3>
        <div className="admin-form-grid">
          <label className="admin-form-field admin-form-wide">
            <span>Cinema <span aria-hidden="true">*</span></span>
            <select
              name="cinemaId"
              value={screenForm.cinemaId}
              onChange={(event) => {
                setScreenForm((current) => ({ ...current, cinemaId: event.target.value }))
                setScreenErrors((current) => ({ ...current, cinemaId: '' }))
                setScreenError('')
              }}
              disabled={cinemaStatus !== 'success' || screenStatus === 'loading'}
              required
              aria-invalid={Boolean(screenErrors.cinemaId)}
            >
              <option value="">Select a cinema</option>
              {cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name} — {cinema.city}</option>)}
            </select>
            {cinemaStatus === 'loading' && <small>Loading cinemas…</small>}
            {cinemaStatus === 'error' && (
              <small className="admin-field-error" role="alert">{cinemaError} <button className="admin-inline-retry" type="button" onClick={retryCinemaLoad}>Retry</button></small>
            )}
            {cinemaStatus === 'success' && cinemas.length === 0 && <small>No cinemas are available. Add a cinema before creating a screen.</small>}
            {screenErrors.cinemaId && <small className="admin-field-error">{screenErrors.cinemaId}</small>}
          </label>
          <label className="admin-form-field">
            <span>Screen name <span aria-hidden="true">*</span></span>
            <input name="name" value={screenForm.name} onChange={(event) => {
              setScreenForm((current) => ({ ...current, name: event.target.value }))
              setScreenErrors((current) => ({ ...current, name: '' }))
              setScreenError('')
            }} maxLength={100} required aria-invalid={Boolean(screenErrors.name)} />
            {screenErrors.name && <small className="admin-field-error">{screenErrors.name}</small>}
          </label>
          <label className="admin-form-field">
            <span>Total seats <span aria-hidden="true">*</span></span>
            <input name="totalSeats" type="number" min="1" max="1000" step="1" value={screenForm.totalSeats} onChange={(event) => {
              setScreenForm((current) => ({ ...current, totalSeats: event.target.value }))
              setScreenErrors((current) => ({ ...current, totalSeats: '' }))
              setScreenError('')
            }} required aria-invalid={Boolean(screenErrors.totalSeats)} />
            {screenErrors.totalSeats && <small className="admin-field-error">{screenErrors.totalSeats}</small>}
          </label>
        </div>
        {screenError && <p className="admin-form-error" role="alert">{screenError}</p>}
        {screenStatus === 'success' && <p className="admin-form-success" role="status">Screen created. It is available for seat generation until this dashboard session ends.</p>}
        <button className="primary-button admin-submit-button" type="submit" disabled={screenStatus === 'loading' || cinemaStatus !== 'success' || cinemas.length === 0}>
          {screenStatus === 'loading' ? 'Creating screen...' : 'Create Screen'}
        </button>
      </form>
      {screensCreatedThisSession.length > 0 && (
        <ul className="admin-item-list admin-created-screens">
          {screensCreatedThisSession.map((screen) => {
            const cinema = cinemas.find((item) => item.id === screen.cinemaId)
            return (
              <li className="admin-item" key={screen.id}>
                <strong>{screen.name}</strong>
                <span>{cinema?.name || 'Cinema'} · Capacity {screen.totalSeats}</span>
                {screen.seatsGenerated && <span>Seats generated</span>}
              </li>
            )
          })}
        </ul>
      )}
      <form className="admin-movie-form" noValidate onSubmit={submitSeatGeneration}>
        <h3>Generate Seats</h3>
        <p className="admin-form-intro">Seat generation writes seat records to the database and cannot be undone from this dashboard.</p>
        <div className="admin-form-grid">
          <label className="admin-form-field admin-form-wide">
            <span>Screen <span aria-hidden="true">*</span></span>
            <select value={selectedScreenId} onChange={(event) => {
              setSelectedScreenId(event.target.value)
              setSeatError('')
              setSeatSuccess('')
              setSeatErrors({})
              setConfirmSeatWrite(false)
            }}>
              <option value="">Select a screen created this session</option>
              {screensCreatedThisSession.map((screen) => (
                <option key={screen.id} value={screen.id} disabled={screen.seatsGenerated}>{screen.name} ({screen.totalSeats} seats){screen.seatsGenerated ? ' — seats generated' : ''}</option>
              ))}
            </select>
            {!screensCreatedThisSession.length && <small>Create a screen above to make it available here.</small>}
            {selectedScreen?.seatsGenerated && <small>Seats have already been generated for this screen.</small>}
          </label>
          <label className="admin-form-field">
            <span>Rows (1–10) <span aria-hidden="true">*</span></span>
            <input type="number" min="1" max="10" step="1" value={seatForm.rows} onChange={(event) => {
              setSeatForm((current) => ({ ...current, rows: event.target.value }))
              setSeatErrors((current) => ({ ...current, rows: '', layout: '' }))
              setSeatError('')
            }} aria-invalid={Boolean(seatErrors.rows || seatErrors.layout)} disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === 'loading'} />
            {seatErrors.rows && <small className="admin-field-error">{seatErrors.rows}</small>}
          </label>
          <label className="admin-form-field">
            <span>Seats per row (1–12) <span aria-hidden="true">*</span></span>
            <input type="number" min="1" max="12" step="1" value={seatForm.seatsPerRow} onChange={(event) => {
              setSeatForm((current) => ({ ...current, seatsPerRow: event.target.value }))
              setSeatErrors((current) => ({ ...current, seatsPerRow: '', layout: '' }))
              setSeatError('')
            }} aria-invalid={Boolean(seatErrors.seatsPerRow || seatErrors.layout)} disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === 'loading'} />
            {seatErrors.seatsPerRow && <small className="admin-field-error">{seatErrors.seatsPerRow}</small>}
          </label>
          <label className="admin-form-field">
            <span>Seat type</span>
            <select value={seatForm.seatType} onChange={(event) => setSeatForm((current) => ({ ...current, seatType: event.target.value }))} disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === 'loading'}>
              <option value="regular">Regular</option>
              <option value="premium">Premium</option>
              <option value="recliner">Recliner</option>
            </select>
          </label>
        </div>
        {seatErrors.layout && <p className="admin-field-error">{seatErrors.layout}</p>}
        <label className="admin-confirm-field">
          <input type="checkbox" checked={confirmSeatWrite} onChange={(event) => {
            setConfirmSeatWrite(event.target.checked)
            setSeatErrors((current) => ({ ...current, confirmation: '' }))
          }} disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === 'loading'} />
          I understand this will create seat records for the selected screen.
        </label>
        {seatErrors.confirmation && <p className="admin-field-error">{seatErrors.confirmation}</p>}
        {seatError && <p className="admin-form-error" role="alert">{seatError}</p>}
        {seatSuccess && <p className="admin-form-success" role="status">{seatSuccess}</p>}
        <button className="primary-button admin-submit-button" type="submit" disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === 'loading'}>
          {seatStatus === 'loading' ? 'Generating seats...' : 'Generate Seats'}
        </button>
      </form>
    </section>
  )
}

function parsePriceInPaise(value) {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const [rupees, paise = ''] = normalized.split('.')
  const significantRupees = rupees.replace(/^0+(?=\d)/, '')
  if (significantRupees.length > 15) return null
  const amount = BigInt(significantRupees) * 100n + BigInt(paise.padEnd(2, '0') || '0')
  return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null
}

function toApiTimestamp(localDateTime) {
  const date = new Date(localDateTime)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function ShowtimeForm({ token, screens, onCreated }) {
  const [movies, setMovies] = useState([])
  const [movieStatus, setMovieStatus] = useState('loading')
  const [movieError, setMovieError] = useState('')
  const [movieLoadAttempt, setMovieLoadAttempt] = useState(0)
  const [form, setForm] = useState({
    movieId: '',
    screenId: '',
    startsAt: '',
    endsAt: '',
    priceInRupees: '',
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const submissionInFlight = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getDashboardMovies({ signal: controller.signal })
      .then((loadedMovies) => {
        setMovies(loadedMovies)
        setMovieStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setMovieError(error.message || 'Unable to load movies for the showtime form.')
        setMovieStatus('error')
      })

    return () => controller.abort()
  }, [movieLoadAttempt])

  const selectedMovie = movies.find((movie) => movie.id === form.movieId)
  const selectedScreen = screens.find((screen) => screen.id === form.screenId)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setApiError('')
    setSuccessMessage('')
    setStatus((current) => current === 'error' || current === 'success' ? 'idle' : current)
  }

  async function submitShowtime(event) {
    event.preventDefault()
    if (submissionInFlight.current) return

    const validationErrors = {}
    if (!selectedMovie) validationErrors.movieId = 'Select a movie from the catalog.'
    if (!selectedScreen) validationErrors.screenId = 'Select a screen created during this dashboard session.'

    const startsAtDate = new Date(form.startsAt)
    const endsAtDate = new Date(form.endsAt)
    const startsAt = toApiTimestamp(form.startsAt)
    const endsAt = toApiTimestamp(form.endsAt)
    if (!form.startsAt || !startsAt || Number.isNaN(startsAtDate.getTime())) {
      validationErrors.startsAt = 'Enter a valid start date and time.'
    }
    if (!form.endsAt || !endsAt || Number.isNaN(endsAtDate.getTime())) {
      validationErrors.endsAt = 'Enter a valid end date and time.'
    } else if (startsAt && endsAtDate <= startsAtDate) {
      validationErrors.endsAt = 'End time must be after start time.'
    } else if (selectedMovie && startsAt && endsAtDate - startsAtDate < selectedMovie.durationMinutes * 60_000) {
      validationErrors.endsAt = `End time must allow at least ${selectedMovie.durationMinutes} minutes for this movie.`
    }

    const priceInPaise = parsePriceInPaise(form.priceInRupees)
    if (priceInPaise === null) {
      validationErrors.priceInRupees = 'Enter a non-negative amount with no more than two decimal places.'
    } else if (priceInPaise > 10_000_000) {
      validationErrors.priceInRupees = 'Ticket price cannot exceed ₹100,000 (10,000,000 paise).'
    }

    setErrors(validationErrors)
    setApiError('')
    setSuccessMessage('')
    if (Object.keys(validationErrors).length) {
      setStatus('idle')
      return
    }

    submissionInFlight.current = true
    setStatus('loading')
    try {
      const created = await createDashboardShowtime({
        movieId: selectedMovie.id,
        screenId: selectedScreen.id,
        startsAt,
        endsAt,
        priceInPaise,
      }, token)
      const enrichedShowtime = {
        ...created,
        movieTitle: selectedMovie.title,
        durationMinutes: selectedMovie.durationMinutes,
        screenName: selectedScreen.name,
        cinemaName: selectedScreen.cinemaName || '',
      }
      onCreated(enrichedShowtime)
      setSuccessMessage(`Showtime for “${selectedMovie.title}” was created. Refreshing the list…`)
      setForm({ movieId: '', screenId: '', startsAt: '', endsAt: '', priceInRupees: '' })
      setStatus('success')
    } catch (error) {
      setApiError(error.message || 'Unable to create the showtime.')
      setStatus('error')
    } finally {
      submissionInFlight.current = false
    }
  }

  function retryMovieLoad() {
    setMovieError('')
    setMovieStatus('loading')
    setMovieLoadAttempt((attempt) => attempt + 1)
  }

  return (
    <form className="admin-movie-form" noValidate onSubmit={submitShowtime}>
      <h3>Create Showtime</h3>
      <p className="admin-form-intro">Choose a catalog movie and a screen created during this dashboard session. Screen options are not restored after reload.</p>
      <div className="admin-form-grid">
        <label className="admin-form-field admin-form-wide">
          <span>Movie <span aria-hidden="true">*</span></span>
          <select name="movieId" value={form.movieId} onChange={updateField} disabled={movieStatus !== 'success' || status === 'loading'} aria-invalid={Boolean(errors.movieId)}>
            <option value="">Select a movie</option>
            {movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}
          </select>
          {movieStatus === 'loading' && <small>Loading movies…</small>}
          {movieStatus === 'error' && <small className="admin-field-error" role="alert">{movieError} <button className="admin-inline-retry" type="button" onClick={retryMovieLoad}>Retry</button></small>}
          {movieStatus === 'success' && movies.length === 0 && <small>No movies are available. Add a movie before scheduling a showtime.</small>}
          {errors.movieId && <small className="admin-field-error">{errors.movieId}</small>}
        </label>
        <label className="admin-form-field admin-form-wide">
          <span>Screen <span aria-hidden="true">*</span></span>
          <select name="screenId" value={form.screenId} onChange={updateField} disabled={!screens.length || status === 'loading'} aria-invalid={Boolean(errors.screenId)}>
            <option value="">Select a screen created this session</option>
            {screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name} — {screen.cinemaName || 'Cinema'}</option>)}
          </select>
          {!screens.length && <small>No eligible screen is available. Create a screen in this dashboard session; screen options are lost after reload.</small>}
          {errors.screenId && <small className="admin-field-error">{errors.screenId}</small>}
        </label>
        <label className="admin-form-field">
          <span>Start date and time <span aria-hidden="true">*</span></span>
          <input type="datetime-local" name="startsAt" value={form.startsAt} onChange={updateField} disabled={status === 'loading'} aria-invalid={Boolean(errors.startsAt)} />
          <small>Entered in your local timezone; sent to the API as an ISO 8601 timestamp.</small>
          {errors.startsAt && <small className="admin-field-error">{errors.startsAt}</small>}
        </label>
        <label className="admin-form-field">
          <span>End date and time <span aria-hidden="true">*</span></span>
          <input type="datetime-local" name="endsAt" value={form.endsAt} onChange={updateField} disabled={status === 'loading'} aria-invalid={Boolean(errors.endsAt)} />
          {errors.endsAt && <small className="admin-field-error">{errors.endsAt}</small>}
        </label>
        <label className="admin-form-field">
          <span>Ticket price (INR) <span aria-hidden="true">*</span></span>
          <input type="text" inputMode="decimal" name="priceInRupees" value={form.priceInRupees} onChange={updateField} placeholder="e.g. 250.00" disabled={status === 'loading'} aria-invalid={Boolean(errors.priceInRupees)} />
          {errors.priceInRupees && <small className="admin-field-error">{errors.priceInRupees}</small>}
        </label>
      </div>
      {apiError && <p className="admin-form-error" role="alert">{apiError}</p>}
      {successMessage && <p className="admin-form-success" role="status">{successMessage}</p>}
      <button className="primary-button admin-submit-button" type="submit" disabled={status === 'loading' || movieStatus !== 'success' || movies.length === 0 || screens.length === 0}>
        {status === 'loading' ? 'Creating showtime...' : 'Create Showtime'}
      </button>
    </form>
  )
}

function AdminListSection({ title, description, loadItems, renderItem, token, showAddMovie = false, showAddCinema = false, showAddShowtime = false, screens = [], icon = 'category' }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [createdItem, setCreatedItem] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    loadItems({ signal: controller.signal })
      .then((loadedItems) => {
        setItems(createdItem && !loadedItems.some((item) => item.id === createdItem.id)
          ? [createdItem, ...loadedItems]
          : loadedItems)
        setStatus('success')
      })
      .catch((loadError) => {
        if (controller.signal.aborted) return
        const createdLabel = createdItem?.name || createdItem?.title || createdItem?.movieTitle
        const refreshMessage = createdItem
          ? `${createdLabel ? `“${createdLabel}” was created, but ` : 'The item was created, but '}the ${title.toLowerCase()} list could not be refreshed.`
          : ''
        setError(refreshMessage ? `${refreshMessage} ${loadError.message || 'Please retry the list refresh.'}` : loadError.message || `Unable to load ${title.toLowerCase()}.`)
        setStatus('error')
      })

    return () => controller.abort()
  }, [createdItem, loadAttempt, loadItems, title])

  function retryLoading() {
    setStatus('loading')
    setError('')
    setLoadAttempt((attempt) => attempt + 1)
  }

  function handleItemCreated(item) {
    setCreatedItem(item)
    setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
    setStatus('loading')
    setError('')
    setLoadAttempt((attempt) => attempt + 1)
  }

  const renderedItems = items.length ? (
    <ul className="admin-item-list">
      {items.map((item) => (
        <li className="admin-item" key={item.id}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  ) : null

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <span className="section-kicker">CATALOG</span>
          <div className="admin-title-row">
            <span className="material-symbols-outlined admin-title-icon crimson" aria-hidden="true">{icon}</span>
            <h2>{title}</h2>
          </div>
          <p>{description}</p>
        </div>
        {status === 'success' && <span className="admin-count">{items.length} listed</span>}
      </div>
      {status === 'loading' ? (
        <p className="admin-state" role="status">Loading {title.toLowerCase()}...</p>
      ) : status === 'error' ? (
        <>
          <div className="admin-state" role="alert">
            <p>{error}</p>
            <button className="secondary-button" type="button" onClick={retryLoading}>Try again</button>
          </div>
          {renderedItems}
        </>
      ) : renderedItems ? (
        renderedItems
      ) : (
        <p className="admin-state">No {title.toLowerCase()} are available.</p>
      )}
      {showAddMovie && <AddMovieForm token={token} onCreated={handleItemCreated} />}
      {showAddCinema && <AddCinemaForm token={token} onCreated={handleItemCreated} />}
      {showAddShowtime && <ShowtimeForm token={token} screens={screens} onCreated={handleItemCreated} />}
      <p className="admin-capability">
        {showAddMovie || showAddCinema || showAddShowtime
          ? 'Edit and delete endpoints are not available.'
          : 'Create endpoint exists; dashboard forms are not available. Edit and delete endpoints are not available.'}
      </p>
    </section>
  )
}

function AdminDashboard({ authSession, onBack, onSignIn }) {
  const [screensCreatedThisSession, setScreensCreatedThisSession] = useState([])

  if (!authSession) {
    return (
      <main className="admin-page">
        <button className="secondary-button back-button" type="button" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden="true">arrow_back</span>
          <span>Back to Movies</span>
        </button>
        <div className="empty-state" role="status">
          <h1>Admin access required</h1>
          <p>Sign in with an administrator account to open this dashboard.</p>
          <button className="primary-button" type="button" onClick={onSignIn}>Sign in</button>
        </div>
      </main>
    )
  }

  if (authSession.user?.role !== 'admin') {
    return (
      <main className="admin-page">
        <button className="secondary-button back-button" type="button" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden="true">arrow_back</span>
          <span>Back to Movies</span>
        </button>
        <div className="empty-state" role="alert">
          <h1>Admin access required</h1>
          <p>This account does not have permission to view the dashboard.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <button className="secondary-button back-button" type="button" onClick={onBack}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden="true">arrow_back</span>
        <span>Back to Movies</span>
      </button>
      <header className="admin-page-heading">
        <span className="section-kicker">CINEVO MANAGEMENT</span>
        <h1>Admin Dashboard</h1>
        <p>Catalog overview from the existing Cinevo APIs.</p>
      </header>
      <div className="admin-grid">
        <AdminListSection
          title="Movies"
          icon="movie"
          description="Movie records currently in the catalog."
          loadItems={getDashboardMovies}
          token={authSession.token}
          showAddMovie
          renderItem={(movie) => (
            <>
              <strong>{movie.title}</strong>
              <span>{[movie.language, movie.durationMinutes ? `${movie.durationMinutes} min` : ''].filter(Boolean).join(' · ') || 'Movie details unavailable'}</span>
            </>
          )}
        />
        <AdminListSection
          title="Cinemas"
          icon="theater_comedy"
          description="Cinema locations registered with Cinevo."
          loadItems={getDashboardCinemas}
          renderItem={(cinema) => (
            <>
              <strong>{cinema.name}</strong>
              <span>{[cinema.city, cinema.state].filter(Boolean).join(', ') || cinema.address || 'Location details unavailable'}</span>
            </>
          )}
          token={authSession.token}
          showAddCinema
        />
        <ScreenManagementSection
          token={authSession.token}
          screensCreatedThisSession={screensCreatedThisSession}
          setScreensCreatedThisSession={setScreensCreatedThisSession}
        />
        <AdminListSection
          title="Showtimes"
          icon="schedule"
          description="Scheduled screenings returned by the existing list API."
          loadItems={getDashboardShowtimes}
          token={authSession.token}
          screens={screensCreatedThisSession}
          showAddShowtime
          renderItem={(showtime) => (
            <>
              <strong>{showtime.movieTitle}</strong>
              <span>{[showtime.cinemaName, showtime.screenName].filter(Boolean).join(' · ')}</span>
              <span>{formatShowtimeDateTime(showtime.startsAt) || 'Start time unavailable'}</span>
            </>
          )}
        />
      </div>
    </main>
  )
}

function MyBookings({ authSession, onAuthenticated, onAuthenticationExpired, onBack }) {
  const [bookings, setBookings] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [cancelingId, setCancelingId] = useState(null)
  const [cancelError, setCancelError] = useState('')
  const [cancelNotice, setCancelNotice] = useState('')
  const cancelInFlight = useRef(false)

  useEffect(() => {
    if (!authSession?.token) return undefined

    const controller = new AbortController()

    getMyBookings(authSession.token, { signal: controller.signal })
      .then((loadedBookings) => {
        if (controller.signal.aborted) return
        setBookings(loadedBookings)
        setStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setErrorMessage(error.message || 'Unable to load your bookings.')
        setStatus('error')
        if (error.status === 401) onAuthenticationExpired()
      })

    return () => controller.abort()
  }, [authSession?.token, loadAttempt, onAuthenticationExpired])

  function retryLoading() {
    setErrorMessage('')
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  function handleAuthenticated(session) {
    setStatus('loading')
    setErrorMessage('')
    onAuthenticated(session)
  }

  async function confirmCancellation(bookingId) {
    if (cancelInFlight.current) return
    cancelInFlight.current = true
    setCancelingId(bookingId)
    setCancelError('')
    setCancelNotice('')

    try {
      const result = await cancelExistingBooking(bookingId, authSession.token)
      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: result.booking.status, updatedAt: result.booking.updatedAt }
            : booking,
        ),
      )
      setCancelNotice(`Booking ${bookingId} cancelled. Its seats have been released.`)
      setConfirmCancelId(null)
    } catch (error) {
      if (error.status === 401) {
        onAuthenticationExpired()
        setErrorMessage('Your sign-in has expired. Please sign in again to view bookings.')
        setStatus('error')
      } else {
        setCancelError(error.message || 'Unable to cancel this booking.')
        if (error.status === 404 || error.status === 409) {
          setLoadAttempt((attempt) => attempt + 1)
        }
      }
    } finally {
      cancelInFlight.current = false
      setCancelingId(null)
    }
  }

  return (
    <main className="bookings-page">
      <button className="secondary-button back-button" onClick={onBack}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden="true">arrow_back</span>
        <span>Back to Movies</span>
      </button>

      <div className="bookings-page-heading">
        <span className="section-kicker">YOUR CINEVO ACCOUNT</span>
        <h1>My Bookings</h1>
        <p>Your luxury cinema reservation history and active digital passes.</p>
      </div>

      {!authSession ? (
        <div className="bookings-auth">
          <div className="empty-state">
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#ffb3b6' }} aria-hidden="true">lock</span>
            <h2>Sign in to view your bookings</h2>
            <p>Your booking history and digital passes are private to your account.</p>
          </div>
          <AuthForm onAuthenticated={handleAuthenticated} message={errorMessage} />
        </div>
      ) : status === 'loading' ? (
        <div className="empty-state" role="status">
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#ffb3b6', animation: 'spin 1.5s linear infinite' }} aria-hidden="true">sync</span>
          <h3>Loading your bookings...</h3>
          <p>Fetching your luxury screening reservations.</p>
        </div>
      ) : status === 'error' ? (
        <div className="empty-state" role="alert">
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#ffb4ab' }} aria-hidden="true">cloud_off</span>
          <h3>We couldn’t load your bookings</h3>
          <p>{errorMessage}</p>
          {authSession && (
            <button className="secondary-button" onClick={retryLoading}>Try again</button>
          )}
          {!authSession && <AuthForm onAuthenticated={handleAuthenticated} message={errorMessage} />}
        </div>
      ) : (
        <>
          {cancelNotice && <div className="booking-notice" role="status">{cancelNotice}</div>}
          {cancelError && <div className="notice booking-error" role="alert">{cancelError}</div>}
          {bookings.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#554f5c' }} aria-hidden="true">theater_comedy</span>
              <h3>No bookings yet</h3>
              <p>When you reserve a screening, your luxury digital passes will appear here.</p>
              <button
                className="primary-button"
                type="button"
                style={{ marginTop: '16px' }}
                onClick={() => { window.location.hash = '#movies' }}
              >
                <span>Explore Movies</span>
                <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
              </button>
            </div>
          ) : (
            <div className="booking-list">
              {bookings.map((booking) => {
                const isActive = booking.status === 'confirmed'
                const seatLabels = (booking.seats ?? [])
                  .map((seat) => (seat.rowLabel && Number.isInteger(seat.seatNumber) ? getSeatLabel(seat) : null))
                  .filter(Boolean)

                return (
                  <article className={`booking-card ${isActive ? 'active' : 'cancelled'}`} key={booking.id}>
                    <div className="booking-card-main">
                      <div className="booking-card-heading">
                        <div>
                          <span className="section-kicker">CINEMA PASS</span>
                          <h2>{booking.showtime?.movieTitle || 'Movie details unavailable'}</h2>
                        </div>
                        <span className={isActive ? 'booking-status active' : 'booking-status cancelled'}>
                          <span className="status-dot" aria-hidden="true" />
                          <span>{isActive ? 'Confirmed Reservation' : 'Cancelled'}</span>
                        </span>
                      </div>

                      <p className="booking-id">
                        <span className="booking-id-label">Ref ID:</span> <strong>{booking.id}</strong>
                      </p>

                      <div className="booking-card-details">
                        {booking.showtime?.cinemaName && (
                          <div className="booking-detail-item">
                            <span className="coord-label">VENUE</span>
                            <p><strong>{booking.showtime.cinemaName}</strong></p>
                          </div>
                        )}
                        {booking.showtime?.screenName && (
                          <div className="booking-detail-item">
                            <span className="coord-label">AUDITORIUM</span>
                            <p><strong className="crimson">{booking.showtime.screenName}</strong></p>
                          </div>
                        )}
                        {booking.showtime?.startsAt && (
                          <div className="booking-detail-item">
                            <span className="coord-label">SHOWTIME</span>
                            <p><strong>{formatShowtimeDateTime(booking.showtime.startsAt)}</strong></p>
                          </div>
                        )}
                        {seatLabels.length > 0 && (
                          <div className="booking-detail-item">
                            <span className="coord-label">RESERVED SEATS</span>
                            <p><strong className="gold">{seatLabels.join(', ')}</strong></p>
                          </div>
                        )}
                        {Number.isFinite(booking.totalAmountInPaise) && (
                          <div className="booking-detail-item">
                            <span className="coord-label">TOTAL PAID</span>
                            <p><strong className="price-lead">{formatTicketPrice(booking.totalAmountInPaise)}</strong></p>
                          </div>
                        )}
                        {booking.createdAt && (
                          <div className="booking-detail-item">
                            <span className="coord-label">BOOKED ON</span>
                            <p><span>{formatReleaseDate(booking.createdAt)}</span></p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="booking-card-actions">
                      {isActive ? (
                        confirmCancelId === booking.id ? (
                          <div className="cancel-confirmation" role="group" aria-label="Confirm booking cancellation">
                            <span>Cancel this booking? Its seats will be released.</span>
                            <button
                              className="cancel-confirm-button"
                              type="button"
                              disabled={cancelingId === booking.id}
                              onClick={() => confirmCancellation(booking.id)}
                            >
                              {cancelingId === booking.id ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                            <button
                              className="cancel-keep-button"
                              type="button"
                              disabled={cancelingId === booking.id}
                              onClick={() => setConfirmCancelId(null)}
                            >
                              Keep Booking
                            </button>
                          </div>
                        ) : (
                          <button
                            className="cancel-booking-button"
                            type="button"
                            onClick={() => {
                              setCancelError('')
                              setConfirmCancelId(booking.id)
                            }}
                          >
                            Cancel Reservation
                          </button>
                        )
                      ) : (
                        <span className="booking-inactive-tag">
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">block</span>
                          <span>Seats Released</span>
                        </span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}
    </main>
  )
}

function ShowtimesSection({ movieId, movie, authSession, onAuthenticated, onAuthenticationExpired }) {
  const [showtimes, setShowtimes] = useState([])
  const [selectedShowtime, setSelectedShowtime] = useState(null)
  const [activeDockShowtime, setActiveDockShowtime] = useState(null)
  const [selectedDateKey, setSelectedDateKey] = useState('')
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getShowtimesByMovieId(movieId, { signal: controller.signal })
      .then((loadedShowtimes) => {
        setShowtimes(loadedShowtimes)
        if (loadedShowtimes && loadedShowtimes.length > 0) {
          setActiveDockShowtime(loadedShowtimes[0])
        }
        setStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setErrorMessage(error.message || 'Unable to load showtimes.')
        setStatus('error')
      })

    return () => controller.abort()
  }, [movieId, loadAttempt])

  const uniqueDateKeys = useMemo(() => {
    const set = new Set()
    showtimes.forEach((s) => {
      const key = getShowtimeDateKey(s.startsAt)
      if (key) set.add(key)
    })
    return Array.from(set).sort()
  }, [showtimes])

  const activeDateKey = (selectedDateKey && uniqueDateKeys.includes(selectedDateKey))
    ? selectedDateKey
    : (uniqueDateKeys[0] || '')

  const dateFilteredShowtimes = useMemo(() => {
    if (!activeDateKey) return showtimes
    return showtimes.filter((s) => getShowtimeDateKey(s.startsAt) === activeDateKey)
  }, [showtimes, activeDateKey])

  const venues = useMemo(() => {
    const map = new Map()
    dateFilteredShowtimes.forEach((s) => {
      const venueName = s.cinemaName || 'Cinevo Flagship Cinema'
      if (!map.has(venueName)) {
        map.set(venueName, {
          name: venueName,
          city: s.city || '',
          screenName: s.screenName || '',
          screenFormat: s.screenFormat || '',
          showtimes: [],
        })
      }
      map.get(venueName).showtimes.push(s)
    })
    return Array.from(map.values())
  }, [dateFilteredShowtimes])

  function retryLoading() {
    setErrorMessage('')
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  return (
    <section className="showtimes-section" id="showtime-matrix" aria-labelledby="showtimes-heading">
      {selectedShowtime ? (
        <SeatSelection
          showtime={selectedShowtime}
          movie={movie}
          authSession={authSession}
          onAuthenticated={onAuthenticated}
          onAuthenticationExpired={onAuthenticationExpired}
          onBack={() => setSelectedShowtime(null)}
        />
      ) : (
        <>
          <div className="showtimes-heading">
            <div>
              <span className="section-kicker">SELECT DATE &amp; AUDITORIUM</span>
              <h2 id="showtimes-heading">Showtime Schedule</h2>
            </div>
            {/* Status Legend */}
            <div className="showtime-legend" aria-label="Showtime Availability Legend">
              <span className="legend-item">
                <span className="legend-dot available" /> Available
              </span>
              <span className="legend-item">
                <span className="legend-dot filling-fast" /> Filling Fast
              </span>
              <span className="legend-item">
                <span className="legend-dot selected" /> Selected
              </span>
              <span className="legend-item">
                <span className="legend-dot sold-out" /> Sold Out
              </span>
            </div>
          </div>

          {status === 'loading' ? (
            <div className="empty-state showtimes-state" role="status">
              <span className="material-symbols-outlined text-primary text-4xl mb-2 animate-spin">progress_activity</span>
              <h3>Finding showtimes...</h3>
              <p>Checking available screenings and auditorium slots for this movie.</p>
            </div>
          ) : status === 'error' ? (
            <div className="empty-state showtimes-state" role="alert">
              <span className="material-symbols-outlined text-primary text-4xl mb-2">warning</span>
              <h3>We couldn’t load showtimes</h3>
              <p>{errorMessage}</p>
              <button className="secondary-button" onClick={retryLoading}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
                <span>Try again</span>
              </button>
            </div>
          ) : showtimes.length === 0 ? (
            <div className="empty-state showtimes-state">
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#ffb3b6' }}>event_busy</span>
              <h3>No showtimes available</h3>
              <p>There are no screenings listed for this movie right now. Check back soon or inquire for private bookings.</p>
            </div>
          ) : (
            <>
              {/* Date Filter Ribbon */}
              {uniqueDateKeys.length > 1 && (
                <div className="showtime-date-ribbon" role="tablist" aria-label="Screening Dates">
                  {uniqueDateKeys.map((dateKey) => {
                    const isSelected = dateKey === activeDateKey
                    const { relativeLabel, dayName, dayMonth } = formatShowtimeDateParts(dateKey)
                    const count = showtimes.filter((s) => getShowtimeDateKey(s.startsAt) === dateKey).length

                    return (
                      <button
                        key={dateKey}
                        role="tab"
                        aria-selected={isSelected}
                        className={`date-tab-card ${isSelected ? 'active' : ''}`}
                        type="button"
                        onClick={() => {
                          setSelectedDateKey(dateKey)
                          const firstInDate = showtimes.find((s) => getShowtimeDateKey(s.startsAt) === dateKey)
                          if (firstInDate) setActiveDockShowtime(firstInDate)
                        }}
                      >
                        <div className="date-tab-top">
                          <span className="date-tab-rel">{relativeLabel}</span>
                          <span className="date-tab-pill">{dayMonth}</span>
                        </div>
                        <div className="date-tab-bottom">
                          <span className="date-tab-day">{dayName}</span>
                          <span className="date-tab-count">
                            {count} {count === 1 ? 'Screening' : 'Screenings'}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Venues & Showtime Matrix */}
              <div className="venue-card-list">
                {venues.map((venue) => {
                  const formats = Array.from(new Set(venue.showtimes.map((s) => s.screenFormat).filter(Boolean)))
                  const prices = venue.showtimes.map((s) => s.priceInPaise).filter((p) => Number.isFinite(p) && p >= 0)
                  const minPrice = prices.length > 0 ? Math.min(...prices) : null
                  const maxPrice = prices.length > 0 ? Math.max(...prices) : null

                  return (
                    <div className="venue-card" key={venue.name}>
                      <div className="venue-card-header">
                        <div className="venue-info-block">
                          <div className="venue-title-row">
                            <span className="material-symbols-outlined venue-icon">theater_comedy</span>
                            <h3 className="venue-title">{venue.name}</h3>
                            {venue.city && <span className="venue-badge">{venue.city}</span>}
                          </div>
                          <p className="venue-subtitle">
                            {[venue.city, venue.screenName || 'Flagship Auditorium'].filter(Boolean).join(' · ')}
                          </p>
                        </div>

                        <div className="venue-format-tags">
                          {formats.length > 0 ? (
                            formats.map((fmt) => (
                              <span key={fmt} className="format-tag">{fmt}</span>
                            ))
                          ) : (
                            <>
                              <span className="format-tag">IMAX Laser</span>
                              <span className="format-tag">Dolby 12-Channel</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="venue-auditorium-block">
                        <div className="auditorium-bar">
                          <span className="auditorium-title">
                            <span className="material-symbols-outlined verified-icon">verified</span>
                            {venue.screenName || 'Auditorium 1'} · {venue.screenFormat || 'Dolby Atmos Master'}
                          </span>
                          {minPrice !== null && (
                            <span className="auditorium-price-range">
                              {formatTicketPrice(minPrice)}
                              {maxPrice !== null && maxPrice !== minPrice ? ` – ${formatTicketPrice(maxPrice)}` : ''}
                            </span>
                          )}
                        </div>

                        <div className="showtime-grid">
                          {venue.showtimes.map((showtime) => {
                            const timeStr = formatShowtimeTime(showtime.startsAt)
                            const fullDateTime = formatShowtimeDateTime(showtime.startsAt)
                            const ticketPrice = formatTicketPrice(showtime.priceInPaise)
                            const isSelected = activeDockShowtime?.id === showtime.id

                            return (
                              <article
                                key={showtime.id}
                                className={`showtime-card ${isSelected ? 'active-slot' : ''}`}
                                onMouseEnter={() => setActiveDockShowtime(showtime)}
                                onClick={() => setActiveDockShowtime(showtime)}
                              >
                                <div className="showtime-card-top">
                                  <span className="showtime-slot-time">{timeStr || fullDateTime}</span>
                                  <span className="showtime-status-pill available">Available</span>
                                </div>

                                <div className="showtime-card-mid">
                                  <span className="showtime-slot-format">{showtime.screenFormat || '4K Laser'}</span>
                                  {ticketPrice && <span className="showtime-price">{ticketPrice}</span>}
                                </div>

                                <button
                                  className="showtime-select-button"
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedShowtime(showtime)
                                  }}
                                  aria-label={`Select seats for ${showtime.cinemaName || 'Screening'} at ${timeStr || fullDateTime}`}
                                >
                                  Select Seats <span>→</span>
                                </button>
                              </article>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Selection Summary Sticky Booking Dock */}
              {activeDockShowtime && (
                <aside className="sticky-booking-dock" aria-label="Showtime Selection Dock">
                  <div className="sticky-dock-content">
                    <div className="dock-left">
                      {movie?.posterUrl && (
                        <div className="dock-mini-poster">
                          <img src={movie.posterUrl} alt="" />
                        </div>
                      )}
                      <div className="dock-text-group">
                        <div className="dock-meta-line">
                          <span className="dock-movie-title">{movie?.title || 'Selected Feature'}</span>
                          <span className="dock-sep">•</span>
                          <span className="dock-venue-name">{activeDockShowtime.cinemaName || 'Cinevo Auditorium'}</span>
                          <span className="dock-sep">•</span>
                          <span className="dock-time-val">{formatShowtimeDateTime(activeDockShowtime.startsAt)}</span>
                          {activeDockShowtime.screenFormat && (
                            <>
                              <span className="dock-sep">•</span>
                              <span className="dock-format-chip">{activeDockShowtime.screenFormat}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="dock-right">
                      <div className="dock-pricing">
                        <span className="dock-price-sub">Ticket Price</span>
                        <span className="dock-price-main">
                          {formatTicketPrice(activeDockShowtime.priceInPaise)}
                        </span>
                      </div>

                      <button
                        className="primary-button dock-cta-btn"
                        type="button"
                        onClick={() => setSelectedShowtime(activeDockShowtime)}
                      >
                        <span>Select Seats</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </aside>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
function MoviePoster({ movie, index = 0, isSaved, onToggleSaved, showNumber = true }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <div className="movie-poster">
      {movie.posterUrl && !imageFailed ? (
        <img
          className="movie-poster-image"
          src={movie.posterUrl}
          alt={`${movie.title} poster`}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-surface-container via-surface-container-high to-surface-container-lowest">
          <span className="material-symbols-outlined text-4xl text-primary mb-2 opacity-60">movie</span>
          <span className="font-headline-sm text-sm text-on-surface font-semibold line-clamp-2">{movie.title}</span>
        </div>
      )}
      <div className="poster-texture" />
      {showNumber && <span className="poster-number">{String(index + 1).padStart(2, '0')}</span>}
      <span className="poster-format-badge">
        {movie.language === 'English' ? 'IMAX Laser' : movie.language ? `${movie.language} Dub` : 'Standard'}
      </span>
      <span className="poster-rating-badge">
        <span className="material-symbols-outlined">star</span>
        <span>{((8.0 + ((index * 3) % 15) / 10).toFixed(1))}</span>
      </span>
      {onToggleSaved && (
        <button
          className={isSaved ? 'save-button saved' : 'save-button'}
          onClick={onToggleSaved}
          aria-label={isSaved ? 'Remove saved movie' : 'Save movie'}
          title="Save movie"
        >
          {isSaved ? '♥' : '♡'}
        </button>
      )}
      <div className="movie-poster-title">{movie.title}</div>
    </div>
  )
}


function MovieDetails({
  movieId,
  isSaved,
  onToggleSaved,
  onBack,
  authSession,
  onAuthenticated,
  onAuthenticationExpired,
}) {
  const [movie, setMovie] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getMovieById(movieId, { signal: controller.signal })
      .then((loadedMovie) => {
        setMovie(loadedMovie)
        setStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return

        if (error.status === 404) {
          setStatus('not-found')
        } else {
          setErrorMessage(error.message || 'Unable to load this movie.')
          setStatus('error')
        }
      })

    return () => controller.abort()
  }, [movieId, loadAttempt])

  function retryLoading() {
    setMovie(null)
    setErrorMessage('')
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  return (
    <main className="movie-detail-page" id="movie-details">
      {status === 'loading' ? (
        <div className="empty-state movie-detail-loading" role="status">
          <span className="material-symbols-outlined text-primary text-4xl mb-2 animate-spin">progress_activity</span>
          <h2>Loading movie...</h2>
          <p>Getting the details and auditorium programming for this film.</p>
        </div>
      ) : status === 'not-found' ? (
        <div className="empty-state" role="alert">
          <span className="material-symbols-outlined text-primary text-4xl mb-2">search_off</span>
          <h2>Movie not found</h2>
          <p>This movie may have been removed or the link may be incorrect.</p>
          <button className="secondary-button" onClick={onBack}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
            <span>← Back to Movies</span>
          </button>
        </div>
      ) : status === 'error' ? (
        <div className="empty-state" role="alert">
          <span className="material-symbols-outlined text-primary text-4xl mb-2">error</span>
          <h2>We couldn’t load this movie</h2>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={retryLoading}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
            <span>Try again</span>
          </button>
        </div>
      ) : (
        <>
          {/* Breadcrumb Ribbon */}
          <section className="detail-breadcrumb-bar">
            <div className="detail-breadcrumb-container">
              <nav aria-label="Breadcrumb" className="breadcrumb-nav">
                <button type="button" onClick={onBack} className="breadcrumb-link">Home</button>
                <span className="breadcrumb-sep">/</span>
                <button type="button" onClick={onBack} className="breadcrumb-link">Movies</button>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">{movie.title}</span>
              </nav>
              <div className="breadcrumb-status">
                <span className="beacon-dot" />
                <span className="beacon-text">Now Booking · Premium Screenings</span>
              </div>
            </div>
          </section>

          {/* Cinematic Hero Spotlight */}
          <section className="movie-detail-hero">
            <div
              className="detail-hero-backdrop"
              style={{ backgroundImage: `url("${movie.backdropUrl || movie.posterUrl}")` }}
            />
            <div className="detail-hero-gradient-overlay" />
            <div className="detail-hero-radial-overlay" />

            <div className="detail-hero-stage">
              <div className="detail-hero-grid">
                {/* Poster column */}
                <div className="detail-poster-col">
                  <div className="detail-poster-wrapper">
                    {movie.posterUrl ? (
                      <img
                        className="detail-poster-img"
                        src={movie.posterUrl}
                        alt={`${movie.title} poster`}
                      />
                    ) : (
                      <div className="detail-poster-fallback">
                        <span className="material-symbols-outlined text-4xl text-primary mb-2 opacity-60">movie</span>
                        <span className="font-headline-sm text-sm text-on-surface font-semibold">{movie.title}</span>
                      </div>
                    )}
                    {movie.language && (
                      <div className="detail-poster-overlay">
                        <span className="poster-pill-format">{movie.language}</span>
                      </div>
                    )}
                    {onToggleSaved && (
                      <button
                        className={`detail-save-btn ${isSaved ? 'saved' : ''}`}
                        onClick={onToggleSaved}
                        aria-label={isSaved ? 'Remove saved movie' : 'Save movie'}
                        title="Save movie"
                        type="button"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          {isSaved ? 'favorite' : 'favorite_border'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Info column */}
                <div className="detail-info-col">
                  <div className="detail-kicker-row">
                    <span className="detail-kicker-badge">FEATURE PRESENTATION</span>
                  </div>

                  <h1 className="detail-movie-title">{movie.title}</h1>

                  <div className="detail-metadata-ribbon">
                    {formatDuration(movie.durationMinutes) && (
                      <span className="meta-item">
                        <span className="material-symbols-outlined meta-icon">schedule</span>
                        {formatDuration(movie.durationMinutes)}
                      </span>
                    )}
                    {formatReleaseDate(movie.releaseDate) && (
                      <>
                        <span className="meta-dot">·</span>
                        <span className="meta-item">{formatReleaseDate(movie.releaseDate)}</span>
                      </>
                    )}
                    {movie.language && (
                      <>
                        <span className="meta-dot">·</span>
                        <span className="meta-item">{movie.language}</span>
                      </>
                    )}
                  </div>

                  {movie.description && (
                    <div className="detail-synopsis-block">
                      <h2 className="synopsis-heading">Synopsis</h2>
                      <p className="synopsis-body">{movie.description}</p>
                    </div>
                  )}

                  {movie.language && (
                    <div className="detail-audio-chips">
                      <span className="audio-label">Language:</span>
                      <span className="audio-chip">{movie.language}</span>
                    </div>
                  )}

                  <div className="detail-action-buttons">
                    <a className="primary-button select-showtime-cta" href="#showtime-matrix">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
                      <span>Select Showtime</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_downward</span>
                    </a>
                    <button className="secondary-button back-cta-btn" onClick={onBack} type="button">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                      <span>← Back to Movies</span>
                    </button>
                    {onToggleSaved && (
                      <button
                        className={`secondary-button watchlist-cta-btn ${isSaved ? 'active' : ''}`}
                        onClick={onToggleSaved}
                        type="button"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: isSaved ? '#ffb3b6' : 'inherit' }}>
                          {isSaved ? 'favorite' : 'favorite_border'}
                        </span>
                        <span>{isSaved ? 'Saved in Watchlist' : 'Add to Watchlist'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Accreditations Bar (from Stitch) */}
          <section className="detail-tech-accreditations">
            <div className="detail-tech-container">
              <div className="tech-item">
                <span className="tech-item-kicker">Projection Standard</span>
                <h3 className="tech-item-title">Dual 4K Laser &amp; 15/70 Celluloid</h3>
                <p className="tech-item-desc">High Dynamic Range with 1.43:1 / 2.39:1 native aspect fidelity</p>
              </div>
              <div className="tech-divider" />
              <div className="tech-item">
                <span className="tech-item-kicker">Acoustic Architecture</span>
                <h3 className="tech-item-title">Dolby Atmos &amp; Meyer Sound EXP</h3>
                <p className="tech-item-desc">128-Object Soundscape with 64 discrete studio-calibrated channels</p>
              </div>
              <div className="tech-divider" />
              <div className="tech-item">
                <span className="tech-item-kicker">Seating Configuration</span>
                <h3 className="tech-item-title">Bespoke Italian Leather Recliners</h3>
                <p className="tech-item-desc">Generous acoustic row pitch with personal concierge call button</p>
              </div>
            </div>
          </section>

          {/* Showtimes & Auditorium Selection */}
          <ShowtimesSection
            movieId={movie.id}
            movie={movie}
            authSession={authSession}
            onAuthenticated={onAuthenticated}
            onAuthenticationExpired={onAuthenticationExpired}
          />
        </>
      )}
    </main>
  )
}

const CATALOGUE_PAGE_LIMIT = 12
const KNOWN_LANGUAGES = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Bengali',
  'Marathi',
  'Spanish',
  'French',
  'Japanese',
  'Korean',
]

const FORMAT_OPTIONS = [
  'All Formats',
  'IMAX with Laser',
  'Dolby Cinema',
  '4DX Sensory',
  'Insignia Dine-In',
  'ScreenX 270°',
]

function App() {
  const [movies, setMovies] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: CATALOGUE_PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  })
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('All Formats')
  const [heroIndex, setHeroIndex] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [savedMovies, setSavedMovies] = useState([])
  const [notice, setNotice] = useState('')
  const [loadStatus, setLoadStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [selectedMovieId, setSelectedMovieId] = useState(getMovieIdFromHash)
  const [isBookingsPage, setIsBookingsPage] = useState(() => window.location.hash === '#bookings')
  const [isAdminPage, setIsAdminPage] = useState(() => window.location.hash === '#admin')
  const [authMode, setAuthMode] = useState(getAuthModeFromHash)
  const [authSession, setAuthSession] = useState(null)
  const authReturnHash = useRef(
    window.location.hash !== '#signin' && window.location.hash !== '#register'
      ? window.location.hash || '#movies'
      : '#movies',
  )
  const previousRouteHash = useRef(
    window.location.hash && window.location.hash !== '#bookings'
      ? window.location.hash
      : '#movies',
  )

  useEffect(() => {
    const syncRoute = () => {
      setSelectedMovieId(getMovieIdFromHash())
      setIsBookingsPage(window.location.hash === '#bookings')
      setIsAdminPage(window.location.hash === '#admin')
      setAuthMode(getAuthModeFromHash())
    }
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)

    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()

    getMovies({
      page,
      limit: CATALOGUE_PAGE_LIMIT,
      search: debouncedSearch,
      language: selectedLanguage,
      signal: controller.signal,
    })
      .then((data) => {
        setMovies(data.movies)
        setPagination(data.pagination)
        setLoadStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setLoadError(error.message || 'Unable to load movies.')
        setLoadStatus('error')
      })

    return () => controller.abort()
  }, [debouncedSearch, selectedLanguage, page, loadAttempt])

  const languageOptions = useMemo(() => {
    const set = new Set(KNOWN_LANGUAGES)
    movies.forEach((movie) => {
      if (movie.language && movie.language.trim()) {
        set.add(movie.language.trim())
      }
    })
    return Array.from(set).sort()
  }, [movies])

  function handleSearchChange(event) {
    setSearchInput(event.target.value)
    setPage(1)
    setLoadStatus('loading')
  }

  function handleLanguageChange(event) {
    setSelectedLanguage(event.target.value)
    setPage(1)
    setLoadStatus('loading')
  }

  function toggleSaved(id) {
    setSavedMovies((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const clearAuthentication = useCallback(() => {
    setAuthSession(null)
  }, [])

  function retryLoading() {
    setLoadError('')
    setLoadStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  function clearSearch() {
    setSearchInput('')
    setDebouncedSearch('')
    setSelectedLanguage('')
    setPage(1)
    setLoadStatus('loading')
  }

  function openMovie(movieId) {
    window.history.pushState(
      { movieId },
      '',
      `#movie/${encodeURIComponent(movieId)}`,
    )
    setSelectedMovieId(movieId)
    setIsBookingsPage(false)
    setIsAdminPage(false)
    window.scrollTo(0, 0)
  }

  function backToMovies() {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#movies`)
    setSelectedMovieId(null)
    setIsBookingsPage(false)
    setIsAdminPage(false)
    requestAnimationFrame(() => document.getElementById('movies')?.scrollIntoView())
  }

  function openBookings() {
    setAuthMode(null)
    setIsAdminPage(false)
    if (window.location.hash !== '#bookings') {
      previousRouteHash.current = window.location.hash || '#movies'
      window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#bookings`)
    }
    setIsBookingsPage(true)
    window.scrollTo(0, 0)
  }

  function backFromBookings() {
    const previousHash = previousRouteHash.current || '#movies'
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${previousHash}`)
    setIsBookingsPage(false)
    setIsAdminPage(false)
    setSelectedMovieId(getMovieIdFromHash())
    window.scrollTo(0, 0)
  }

  function openAuth(mode) {
    if (window.location.hash !== '#signin' && window.location.hash !== '#register') {
      authReturnHash.current = window.location.hash || '#movies'
    }
    const authHash = mode === 'register' ? '#register' : '#signin'
    window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${authHash}`)
    setAuthMode(mode)
    setIsBookingsPage(false)
    window.scrollTo(0, 0)
  }

  function backFromAuth() {
    const returnHash = authReturnHash.current || '#movies'
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${returnHash}`)
    setAuthMode(null)
    setIsBookingsPage(returnHash === '#bookings')
    setIsAdminPage(returnHash === '#admin')
    setSelectedMovieId(getMovieIdFromHash())
    window.scrollTo(0, 0)
  }

  function completeAuthentication(session) {
    setAuthSession(session)
    const returnHash = authReturnHash.current || '#movies'
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${returnHash}`)
    setAuthMode(null)
    setIsBookingsPage(returnHash === '#bookings')
    setIsAdminPage(returnHash === '#admin')
    setSelectedMovieId(getMovieIdFromHash())
    window.scrollTo(0, 0)
  }

  function logout() {
    setAuthSession(null)
    authReturnHash.current = '#movies'
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#movies`)
    setAuthMode(null)
    setIsBookingsPage(false)
    setIsAdminPage(false)
    setSelectedMovieId(null)
    window.scrollTo(0, 0)
  }

  const spotlightMovie = movies.length > 0 ? movies[heroIndex % movies.length] : null

  return (
    <div className="cinevo">
      <header className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a className="brand" href="#home" aria-label="Cinevo home">
            <span className="brand-text">CINEVO</span>
            <span className="brand-dot" />
          </a>

          <div className="location-pill" style={{ display: 'none' }}>
            <span className="material-symbols-outlined">location_on</span>
            <span>Mumbai · BKC &amp; Palladium</span>
          </div>
        </div>

        <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <a
            className={!selectedMovieId && !isBookingsPage && !isAdminPage && !authMode ? 'nav-active' : ''}
            href="#home"
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </a>
          <a
            href="#movies"
            onClick={() => {
              setMobileMenuOpen(false)
              if (selectedMovieId || isBookingsPage || isAdminPage || authMode) {
                backToMovies()
              } else {
                document.getElementById('movies')?.scrollIntoView({ behavior: 'smooth' })
              }
            }}
          >
            Explore Movies
          </a>
          <a
            className={isBookingsPage ? 'nav-active' : ''}
            href="#bookings"
            onClick={(event) => {
              event.preventDefault()
              setMobileMenuOpen(false)
              openBookings()
            }}
          >
            My Bookings
          </a>
          {authSession?.user?.role === 'admin' && (
            <a
              className={isAdminPage ? 'nav-active' : ''}
              href="#admin"
              onClick={(event) => {
                event.preventDefault()
                setMobileMenuOpen(false)
                window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#admin`)
                setIsAdminPage(true)
                setIsBookingsPage(false)
                setSelectedMovieId(null)
                window.scrollTo(0, 0)
              }}
            >
              Admin Dashboard
            </a>
          )}
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>About</a>
        </nav>

        <div className="nav-actions">
          <button
            className="quick-search-trigger"
            type="button"
            onClick={() => {
              document.getElementById('movies')?.scrollIntoView({ behavior: 'smooth' })
              const input = document.querySelector('.search-box input')
              if (input) input.focus()
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>

          {authSession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="user-badge" title={authSession.user?.email || 'Logged in'}>
                <span className="user-avatar">
                  {authSession.user?.name ? authSession.user.name.charAt(0).toUpperCase() : 'U'}
                </span>
                <span className="user-name">{authSession.user?.name || 'Account'}</span>
              </div>
              <button className="signin-button" type="button" onClick={logout}>Sign out</button>
            </div>
          ) : (
            <button className="signin-button" type="button" onClick={() => openAuth('login')}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
              <span>Sign in</span>
            </button>
          )}

          <button
            className="mobile-nav-toggle"
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </header>

      {authMode ? (
        <AuthPage
          mode={authMode}
          onAuthenticated={completeAuthentication}
          onModeChange={openAuth}
          onBack={backFromAuth}
        />
      ) : isBookingsPage ? (
        <MyBookings
          authSession={authSession}
          onAuthenticated={setAuthSession}
          onAuthenticationExpired={clearAuthentication}
          onBack={backFromBookings}
        />
      ) : isAdminPage ? (
        <AdminDashboard
          authSession={authSession}
          onBack={backToMovies}
          onSignIn={() => openAuth('login')}
        />
      ) : selectedMovieId ? (
        <MovieDetails
          key={selectedMovieId}
          movieId={selectedMovieId}
          isSaved={savedMovies.includes(selectedMovieId)}
          onToggleSaved={() => toggleSaved(selectedMovieId)}
          onBack={backToMovies}
          authSession={authSession}
          onAuthenticated={setAuthSession}
          onAuthenticationExpired={clearAuthentication}
        />
      ) : (
        <main id="home">
          {/* PANORAMIC CINEMATIC HERO SPOTLIGHT */}
          <section className="hero-spotlight" id="spotlight">
            {spotlightMovie ? (
              <>
                <div className="hero-backdrop-container">
                  <img
                    className="hero-backdrop-image"
                    src={spotlightMovie.backdropUrl || spotlightMovie.posterUrl}
                    alt={spotlightMovie.title}
                  />
                  <div className="hero-scrim-bottom" />
                  <div className="hero-scrim-left" />
                </div>

                <div className="hero-content-stage">
                  <div className="hero-spotlight-details">
                    <div className="hero-kicker-badge">
                      <span className="hero-kicker-dot" />
                      <span className="hero-kicker-text">Now Showing · Premier Spotlight</span>
                    </div>

                    <h1 className="hero-title">{spotlightMovie.title}</h1>

                    <div className="hero-metadata-row">
                      {formatDuration(spotlightMovie.durationMinutes) && (
                        <span>{formatDuration(spotlightMovie.durationMinutes)}</span>
                      )}
                      {spotlightMovie.language && (
                        <>
                          <span className="hero-meta-dot" />
                          <span>{spotlightMovie.language}</span>
                        </>
                      )}
                      {formatReleaseDate(spotlightMovie.releaseDate) && (
                        <>
                          <span className="hero-meta-dot" />
                          <span>{formatReleaseDate(spotlightMovie.releaseDate)}</span>
                        </>
                      )}
                    </div>

                    {spotlightMovie.description && (
                      <p className="hero-synopsis">{spotlightMovie.description}</p>
                    )}

                    <div className="hero-cta-cluster">
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => openMovie(spotlightMovie.id)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>confirmation_number</span>
                        <span>Book Tickets</span>
                      </button>
                      <a className="secondary-button" href="#movies">
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>explore</span>
                        <span>Explore Movies</span>
                      </a>
                    </div>
                  </div>

                  {movies.length > 1 && (
                    <div className="hero-nav-strip">
                      <div className="hero-counter-group">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="hero-counter">{String((heroIndex % movies.length) + 1).padStart(2, '0')}</span>
                          <span className="hero-counter-total">/ {String(Math.min(movies.length, 5)).padStart(2, '0')}</span>
                        </div>

                        <div className="hero-progress-bars">
                          {movies.slice(0, Math.min(movies.length, 5)).map((_, dotIdx) => (
                            <div
                              key={dotIdx}
                              className={`hero-progress-bar ${dotIdx === (heroIndex % Math.min(movies.length, 5)) ? 'active' : 'inactive'}`}
                              onClick={() => setHeroIndex(dotIdx)}
                              title={`Jump to movie ${dotIdx + 1}`}
                            />
                          ))}
                        </div>

                        {movies[(heroIndex + 1) % movies.length] && (
                          <span className="hero-next-preview">
                            Next: {movies[(heroIndex + 1) % movies.length].title}
                          </span>
                        )}
                      </div>

                      <div className="hero-controls">
                        <button
                          className="hero-control-btn"
                          type="button"
                          aria-label="Previous Spotlight"
                          onClick={() => setHeroIndex((curr) => (curr - 1 + movies.length) % movies.length)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
                        </button>
                        <button
                          className="hero-control-btn"
                          type="button"
                          aria-label="Next Spotlight"
                          onClick={() => setHeroIndex((curr) => (curr + 1) % movies.length)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hero-content-stage" style={{ padding: '96px 24px' }}>
                <div className="hero-spotlight-details">
                  <span className="hero-kicker-badge">
                    <span className="hero-kicker-dot" />
                    <span className="hero-kicker-text">Private Screenings</span>
                  </span>
                  <h1 className="hero-title">Experience Cinema in Its Purest Form</h1>
                  <p className="hero-synopsis">
                    Curated premier presentations, uncompressed Dolby Atmos sound, and luxurious reclining auditoria.
                  </p>
                  <div className="hero-cta-cluster">
                    <a className="primary-button" href="#movies">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>explore</span>
                      <span>Explore Collection</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* AUDITORIUM FORMATS & TECH BAR */}
          <section className="formats-tech-bar">
            <div className="formats-bar-container">
              <div className="format-pill-list">
                {FORMAT_OPTIONS.map((format) => (
                  <button
                    key={format}
                    className={`format-pill ${selectedFormat === format ? 'active' : ''}`}
                    type="button"
                    onClick={() => setSelectedFormat(format)}
                  >
                    {format}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div className="tech-spec-indicator">
                  <span className="material-symbols-outlined">translate</span>
                  <span>Audio: {selectedLanguage || 'All Languages'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* NOW SHOWING (CURATED 4-COLUMN CATALOGUE GRID) */}
          <section className="movies-section" id="movies">
            <div className="section-heading">
              <div>
                <span className="section-kicker">CURATED REPERTOIRE</span>
                <h2>Now Showing</h2>
                <p className="section-subtitle">Exclusive presentations across private luxury screening rooms.</p>
              </div>
              <span className="movie-count">{(pagination.total ?? movies.length).toString().padStart(2, '0')} FILMS</span>
            </div>

            <div className="movie-toolbar">
              <label className="search-box">
                <span className="material-symbols-outlined search-icon">search</span>
                <input
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder="Search films by title, genre, director..."
                  aria-label="Search movies"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('')
                      setDebouncedSearch('')
                      setPage(1)
                    }}
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                  </button>
                )}
              </label>

              <label className="language-filter">
                <span className="material-symbols-outlined" style={{ color: '#ffb3b6', fontSize: '16px' }}>translate</span>
                <span className="language-filter-label">Language</span>
                <select
                  value={selectedLanguage}
                  onChange={handleLanguageChange}
                  aria-label="Filter by language"
                >
                  <option value="">All languages</option>
                  {languageOptions.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {loadStatus === 'loading' ? (
              <div className="empty-state" role="status">
                <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '32px' }}>progress_activity</span>
                <h3>Curating Film Presentations...</h3>
                <p>Preparing showtimes and private auditorium reservations.</p>
              </div>
            ) : loadStatus === 'error' ? (
              <div className="empty-state" role="alert">
                <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>error</span>
                <h3>Unable to Load Film Programme</h3>
                <p>{loadError}</p>
                <button className="secondary-button" type="button" onClick={retryLoading}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
                  <span>Try again</span>
                </button>
              </div>
            ) : movies.length === 0 ? (
              debouncedSearch || selectedLanguage ? (
                <div className="empty-state" role="status">
                  <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>search_off</span>
                  <h3>No Films Found</h3>
                  <p>We could not find any films matching &ldquo;{debouncedSearch || selectedLanguage}&rdquo;.</p>
                  <button className="secondary-button" type="button" onClick={clearSearch}>
                    Clear filter
                  </button>
                </div>
              ) : (
                <div className="empty-state" role="status">
                  <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>theaters</span>
                  <h3>No Screenings Scheduled</h3>
                  <p>Private screenings are currently being programmed. Please check back shortly.</p>
                </div>
              )
            ) : (
              <>
                <div className={movies.length === 1 ? 'movie-grid single-result' : 'movie-grid'}>
                  {movies.map((movie, index) => {
                    const posterNumber = (page - 1) * CATALOGUE_PAGE_LIMIT + index
                    return (
                      <article className="movie-card group" key={movie.id}>
                        <MoviePoster
                          movie={movie}
                          index={posterNumber}
                          isSaved={savedMovies.includes(movie.id)}
                          onToggleSaved={() => toggleSaved(movie.id)}
                        />
                        <div className="movie-info">
                          <div className="movie-title-row">
                            <h3 title={movie.title}>{movie.title}</h3>
                          </div>
                          <p className="movie-metadata-line">
                            {[getReleaseYear(movie.releaseDate), formatDuration(movie.durationMinutes), movie.language]
                              .filter(Boolean)
                              .map((detail, detailIndex) => (
                                <span key={`${movie.id}-${detailIndex}`}>
                                  {detailIndex > 0 && <span className="metadata-separator">·</span>}
                                  {detail}
                                </span>
                              ))}
                          </p>
                          {movie.description && <p className="movie-description">{movie.description}</p>}
                          <button className="book-button" type="button" onClick={() => openMovie(movie.id)}>
                            <span className="material-symbols-outlined">confirmation_number</span>
                            <span>Book Tickets</span>
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>

                <nav className="catalogue-pagination" aria-label="Movie catalogue pagination">
                  <button
                    className="pagination-button"
                    type="button"
                    disabled={page <= 1 || loadStatus === 'loading'}
                    onClick={() => {
                      setLoadStatus('loading')
                      setPage((p) => Math.max(1, p - 1))
                      document.getElementById('movies')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    aria-label="Previous page"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                    <span>Previous</span>
                  </button>
                  <span className="pagination-status" aria-live="polite">
                    Page <strong>{page}</strong> of <strong>{pagination.totalPages || 1}</strong>
                  </span>
                  <button
                    className="pagination-button"
                    type="button"
                    disabled={page >= pagination.totalPages || loadStatus === 'loading' || pagination.totalPages <= 1}
                    onClick={() => {
                      setLoadStatus('loading')
                      setPage((p) => Math.min(pagination.totalPages, p + 1))
                      document.getElementById('movies')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </button>
                </nav>
              </>
            )}
            {notice && (
              <div className="notice" role="status">
                <span>{notice}</span>
                <button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button>
              </div>
            )}
          </section>

          {/* CLOSING BANNER */}
          <section className="closing-banner" id="about">
            <div>
              <span className="section-kicker">BESPOKE AUDITORIA</span>
              <h2>Private Salon Hires &amp; <span>Executive Screenings.</span></h2>
              <p style={{ color: '#a8898a', fontSize: '14px', marginTop: '6px', maxWidth: '580px' }}>
                Full auditorium lockouts for private premieres, closed previews, and intimate milestone showcases.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a className="secondary-button" href="mailto:concierge@cinevo.luxury">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>mail</span>
                <span>Inquire</span>
              </a>
              <a className="primary-button" href="#movies">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>confirmation_number</span>
                <span>Book Screening</span>
              </a>
            </div>
          </section>
        </main>
      )}

      {/* LUXURY FOOTER */}
      <footer className="luxury-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <a className="brand" href="#home">
                <span className="brand-text">CINEVO</span>
                <span className="brand-dot" />
              </a>
              <p>
                Premier private cinema architecture, uncompressed multi-channel acoustic design, and curated 70mm celluloid screenings for discerning connoisseurs.
              </p>
              <div className="footer-contact-item">
                <span className="footer-contact-label">Private Concierge</span>
                <span className="footer-contact-val">concierge@cinevo.luxury</span>
              </div>
            </div>

            <div>
              <span className="footer-col-title">Flagship Venues</span>
              <ul className="footer-list">
                <li>
                  <strong>CINEVO The Palladium</strong>
                  <small>Lower Parel, Mumbai · 4 Auditoria</small>
                </li>
                <li>
                  <strong>CINEVO BKC Sovereign</strong>
                  <small>Bandra Kurla Complex · Dolby Vision</small>
                </li>
                <li>
                  <strong>CINEVO UB City</strong>
                  <small>Vittal Mallya Rd, Bengaluru · IMAX 70mm</small>
                </li>
                <li>
                  <strong>CINEVO Diplomatic Enclave</strong>
                  <small>Chanakyapuri, New Delhi · Private Salon</small>
                </li>
              </ul>
            </div>

            <div>
              <span className="footer-col-title">Acoustic &amp; Tech</span>
              <ul className="footer-list">
                <li>
                  <strong>IMAX 70mm Dual Laser</strong>
                  <small>High Dynamic Contrast</small>
                </li>
                <li>
                  <strong>Dolby Atmos 128-Object</strong>
                  <small>Full Spatial Audio Master</small>
                </li>
                <li>
                  <strong>Meyer Sound EXP Calibration</strong>
                  <small>Studio Precision Acoustic</small>
                </li>
                <li>
                  <strong>Barco Thor 6P RGB</strong>
                  <small>High Frame Rate Projection</small>
                </li>
              </ul>
            </div>

            <div>
              <span className="footer-col-title">Navigation &amp; Access</span>
              <ul className="footer-list">
                <li><a href="#home">Home Spotlight</a></li>
                <li><a href="#movies">Now Showing</a></li>
                <li><a href="#bookings" onClick={(event) => { event.preventDefault(); openBookings() }}>My Bookings</a></li>
                {authSession?.user?.role === 'admin' && (
                  <li>
                    <a
                      href="#admin"
                      onClick={(event) => {
                        event.preventDefault()
                        window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#admin`)
                        setIsAdminPage(true)
                        setIsBookingsPage(false)
                        setSelectedMovieId(null)
                        window.scrollTo(0, 0)
                      }}
                    >
                      Admin Dashboard
                    </a>
                  </li>
                )}
                <li><a href="mailto:concierge@cinevo.luxury">Private Salon Hire</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <span>&copy; 2026 CINEVO LUXURY CINEMAS PVT LTD. &middot; ALL RIGHTS RESERVED</span>
            <div className="footer-bottom-links">
              <a href="#privacy">Privacy Charter</a>
              <span>&middot;</span>
              <a href="#terms">Terms of Admission</a>
              <span>&middot;</span>
              <a href="#standards">Acoustic Standards</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
