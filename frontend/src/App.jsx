
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authenticate, cancelExistingBooking, createBooking, getMovieById, getMovies, getMyBookings, getSeatsForShowtime, getShowtimesByMovieId } from './lib/api'
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

function AuthForm({ onAuthenticated, message = '' }) {
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authStatus, setAuthStatus] = useState('idle')
  const [authError, setAuthError] = useState('')

  async function submitAuthentication(event) {
    event.preventDefault()
    setAuthError('')
    setAuthStatus('loading')

    try {
      const session = await authenticate(authForm, authMode)
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
      <div className="auth-panel-heading">
        <div>
          <span className="section-kicker">ACCOUNT REQUIRED</span>
          <h3>{authMode === 'login' ? 'Sign in to continue' : 'Create your Cinevo account'}</h3>
        </div>
        <button
          className="auth-mode-toggle"
          type="button"
          onClick={() => {
            setAuthMode((mode) => mode === 'login' ? 'register' : 'login')
            setAuthError('')
          }}
        >
          {authMode === 'login' ? 'Create account' : 'I have an account'}
        </button>
      </div>
      {message && <p className="auth-error" role="status">{message}</p>}
      {authMode === 'register' && (
        <label className="auth-field">
          Name
          <input
            autoComplete="name"
            minLength="2"
            maxLength="100"
            required
            value={authForm.name}
            onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
          />
        </label>
      )}
      <label className="auth-field">
        Email
        <input
          type="email"
          autoComplete="email"
          maxLength="255"
          required
          value={authForm.email}
          onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
        />
      </label>
      <label className="auth-field">
        Password
        <input
          type="password"
          autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
          minLength={authMode === 'register' ? 8 : 1}
          maxLength="72"
          required
          value={authForm.password}
          onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
        />
      </label>
      {authError && <p className="auth-error" role="alert">{authError}</p>}
      <button className="primary-button auth-submit-button" type="submit" disabled={authStatus === 'loading'}>
        {authStatus === 'loading'
          ? 'Please wait...'
          : authMode === 'login'
            ? 'Sign in'
            : 'Create account'}
      </button>
    </form>
  )
}

function SeatSelection({ showtime, authSession, onAuthenticated, onAuthenticationExpired, onBack }) {
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

  return (
    <section className="seat-selection" aria-labelledby="seat-selection-heading">
      <button className="secondary-button back-button" onClick={onBack}>← Back to showtimes</button>
      <div className="seat-selection-heading">
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
        <div className="booking-confirmation" role="status">
          <span className="section-kicker">BOOKING CONFIRMED</span>
          <h3>Your seats are reserved</h3>
          <p className="booking-reference">Booking ID: <strong>{confirmation.booking.id}</strong></p>
          <div className="booking-confirmation-details">
            <div>
              <span className="section-kicker">SHOWTIME</span>
              <p>{showtime.cinemaName}{showtime.city ? ` · ${showtime.city}` : ''}</p>
              <p>{formatShowtimeDateTime(showtime.startsAt)}{showtime.screenName ? ` · ${showtime.screenName}` : ''}</p>
            </div>
            <div>
              <span className="section-kicker">SEATS</span>
              <p>{confirmedSeats.length ? confirmedSeats.map(getSeatLabel).join(', ') : 'Seat labels unavailable'}</p>
            </div>
            {Number.isFinite(confirmation.booking.totalAmountInPaise) && (
              <div>
                <span className="section-kicker">TOTAL</span>
                <p>{formatTicketPrice(confirmation.booking.totalAmountInPaise)}</p>
              </div>
            )}
          </div>
          <p className="booking-payment-note">Payment has not been collected.</p>
        </div>
      ) : (
        <>
          <div className="seat-map-panel">
            <div className="screen-indicator"><span /> SCREEN <span /></div>
            <div className="seat-legend" aria-label="Seat availability legend">
              <span><i className="seat-legend-seat available" /> Available</span>
              <span><i className="seat-legend-seat selected" /> Selected</span>
              <span><i className="seat-legend-seat unavailable" /> Unavailable</span>
            </div>
            <div className="seat-rows">
              {[...seatsByRow.entries()].map(([rowLabel, rowSeats]) => (
                <div className="seat-row" key={rowLabel}>
                  <span className="seat-row-label">{rowLabel}</span>
                  <div className="seat-row-items">
                    {rowSeats.map((seat) => {
                      const isSelected = selectedSeatIds.has(seat.id)
                      const isAvailable = seat.status === 'available'
                      const selectionLimitReached = !isSelected &&
                        selectedSeatIds.size >= MAX_BOOKING_SEATS
                      const seatClass = isSelected
                        ? 'seat-button selected'
                        : isAvailable
                          ? `seat-button available${selectionLimitReached ? ' limit-reached' : ''}`
                          : 'seat-button unavailable'

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
                          {seat.seatNumber}
                        </button>
                      )
                    })}
                  </div>
                  <span className="seat-row-label">{rowLabel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="seat-selection-summary" aria-live="polite">
            <div>
              <span className="section-kicker">YOUR SEATS</span>
              <p>{selectedSeats.length ? selectedSeats.map(getSeatLabel).join(', ') : 'No seats selected'}</p>
              <small>{selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} selected</small>
              {selectedSeats.length >= MAX_BOOKING_SEATS && (
                <small>Maximum {MAX_BOOKING_SEATS} seats per booking.</small>
              )}
            </div>
            <div className="seat-total">
              <span className="section-kicker">TOTAL</span>
              <strong>{totalPrice === null ? 'Price unavailable' : formatTicketPrice(totalPrice)}</strong>
            </div>
            <button
              className="primary-button booking-submit-button"
              type="button"
              disabled={selectedSeatIds.size === 0 || bookingStatus === 'loading'}
              onClick={authSession ? submitBooking : () => {
                setShowAuthForm(true)
                setAuthError('Sign in or create an account before booking.')
              }}
            >
              {bookingStatus === 'loading'
                ? 'Creating booking...'
                : authSession
                  ? 'Book Selected Seats'
                  : 'Continue to Booking'}
            </button>
          </div>
          {bookingError && <div className="notice booking-error" role="alert">{bookingError}</div>}
          {!authSession && showAuthForm && (
            <AuthForm
              key={authError}
              onAuthenticated={(session) => {
                onAuthenticated(session)
                setAuthError('')
                setShowAuthForm(false)
              }}
              message={authError}
            />
          )}
        </>
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
      <button className="secondary-button back-button" onClick={onBack}>← Back</button>
      <div className="bookings-page-heading">
        <span className="section-kicker">YOUR CINEVO ACCOUNT</span>
        <h1>My Bookings</h1>
        <p>Your booking history and current reservation status.</p>
      </div>

      {!authSession ? (
        <div className="bookings-auth">
          <div className="empty-state">
            <h2>Sign in to view your bookings</h2>
            <p>Your booking history is available only to your account.</p>
          </div>
          <AuthForm onAuthenticated={handleAuthenticated} message={errorMessage} />
        </div>
      ) : status === 'loading' ? (
        <div className="empty-state" role="status"><h3>Loading your bookings...</h3><p>Fetching your booking history.</p></div>
      ) : status === 'error' ? (
        <div className="empty-state" role="alert">
          <h3>We couldn’t load your bookings</h3>
          <p>{errorMessage}</p>
          {authSession && <button className="secondary-button" onClick={retryLoading}>Try again</button>}
          {!authSession && <AuthForm onAuthenticated={handleAuthenticated} message={errorMessage} />}
        </div>
      ) : (
        <>
          {cancelNotice && <div className="booking-notice" role="status">{cancelNotice}</div>}
          {cancelError && <div className="notice booking-error" role="alert">{cancelError}</div>}
          {bookings.length === 0 ? (
            <div className="empty-state"><h3>No bookings yet</h3><p>When you book a screening, it will appear here.</p></div>
          ) : (
            <div className="booking-list">
              {bookings.map((booking) => {
                const isActive = booking.status === 'confirmed'
                const seatLabels = (booking.seats ?? [])
                  .map((seat) => seat.rowLabel && Number.isInteger(seat.seatNumber)
                    ? getSeatLabel(seat)
                    : null)
                  .filter(Boolean)

                return (
                  <article className="booking-card" key={booking.id}>
                    <div className="booking-card-heading">
                      <div>
                        <span className="section-kicker">BOOKING</span>
                        <h2>{booking.showtime?.movieTitle || 'Movie details unavailable'}</h2>
                      </div>
                      <span className={isActive ? 'booking-status active' : 'booking-status cancelled'}>
                        {isActive ? 'Confirmed' : 'Cancelled'}
                      </span>
                    </div>
                    <p className="booking-id">ID: {booking.id}</p>
                    <div className="booking-card-details">
                      {booking.showtime?.cinemaName && <p><strong>Cinema</strong>{booking.showtime.cinemaName}</p>}
                      {booking.showtime?.screenName && <p><strong>Screen</strong>{booking.showtime.screenName}</p>}
                      {booking.showtime?.startsAt && (
                        <p><strong>Showtime</strong>{formatShowtimeDateTime(booking.showtime.startsAt)}</p>
                      )}
                      {seatLabels.length > 0 && <p><strong>Seats</strong>{seatLabels.join(', ')}</p>}
                      {Number.isFinite(booking.totalAmountInPaise) && (
                        <p><strong>Total</strong>{formatTicketPrice(booking.totalAmountInPaise)}</p>
                      )}
                      {booking.createdAt && (
                        <p><strong>Booked</strong>{formatReleaseDate(booking.createdAt)}</p>
                      )}
                    </div>
                    {isActive && (
                      <div className="booking-card-actions">
                        {confirmCancelId === booking.id ? (
                          <div className="cancel-confirmation" role="group" aria-label="Confirm booking cancellation">
                            <span>Cancel this booking? Its seats will be released.</span>
                            <button
                              className="cancel-confirm-button"
                              type="button"
                              disabled={cancelingId === booking.id}
                              onClick={() => confirmCancellation(booking.id)}
                            >
                              {cancelingId === booking.id ? 'Cancelling...' : 'Confirm cancellation'}
                            </button>
                            <button
                              className="cancel-keep-button"
                              type="button"
                              disabled={cancelingId === booking.id}
                              onClick={() => setConfirmCancelId(null)}
                            >
                              Keep booking
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
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    )}
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

function ShowtimesSection({ movieId, authSession, onAuthenticated, onAuthenticationExpired }) {
  const [showtimes, setShowtimes] = useState([])
  const [selectedShowtime, setSelectedShowtime] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getShowtimesByMovieId(movieId, { signal: controller.signal })
      .then((loadedShowtimes) => {
        setShowtimes(loadedShowtimes)
        setStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setErrorMessage(error.message || 'Unable to load showtimes.')
        setStatus('error')
      })

    return () => controller.abort()
  }, [movieId, loadAttempt])

  function retryLoading() {
    setErrorMessage('')
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  return (
    <section className="showtimes-section" aria-labelledby="showtimes-heading">
      {selectedShowtime ? (
        <SeatSelection
          showtime={selectedShowtime}
          authSession={authSession}
          onAuthenticated={onAuthenticated}
          onAuthenticationExpired={onAuthenticationExpired}
          onBack={() => setSelectedShowtime(null)}
        />
      ) : (
      <>
      <div className="showtimes-heading">
        <div>
          <span className="section-kicker">FIND A SCREENING</span>
          <h2 id="showtimes-heading">Showtimes</h2>
        </div>
        {status === 'success' && showtimes.length > 0 && (
          <span className="movie-count">{showtimes.length.toString().padStart(2, '0')} SHOWS</span>
        )}
      </div>

      {status === 'loading' ? (
        <div className="empty-state showtimes-state" role="status">
          <h3>Finding showtimes...</h3>
          <p>Checking available screenings for this movie.</p>
        </div>
      ) : status === 'error' ? (
        <div className="empty-state showtimes-state" role="alert">
          <h3>We couldn’t load showtimes</h3>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={retryLoading}>Try again</button>
        </div>
      ) : showtimes.length === 0 ? (
        <div className="empty-state showtimes-state">
          <h3>No showtimes available</h3>
          <p>There are no screenings listed for this movie right now.</p>
        </div>
      ) : (
        <div className="showtime-list">
          {showtimes.map((showtime) => {
            const dateTime = formatShowtimeDateTime(showtime.startsAt)
            const ticketPrice = formatTicketPrice(showtime.priceInPaise)

            return (
              <article className="showtime-card" key={showtime.id}>
                <div className="showtime-venue">
                  {showtime.cinemaName && <h3>{showtime.cinemaName}</h3>}
                  {(showtime.city || showtime.screenName) && (
                    <p>{[showtime.city, showtime.screenName].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                {dateTime && <time className="showtime-date" dateTime={showtime.startsAt}>{dateTime}</time>}
                {ticketPrice && <span className="showtime-price">{ticketPrice}</span>}
                <button
                  className="showtime-select-button"
                  type="button"
                  onClick={() => setSelectedShowtime(showtime)}
                >
                  Select Seats <span>→</span>
                </button>
              </article>
            )
          })}
        </div>
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
      {movie.posterUrl && !imageFailed && (
        <img
          className="movie-poster-image"
          src={movie.posterUrl}
          alt={`${movie.title} poster`}
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="poster-texture" />
      {showNumber && <span className="poster-number">{String(index + 1).padStart(2, '0')}</span>}
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
      <button className="secondary-button back-button" onClick={onBack}>← Back to Movies</button>
      {status === 'loading' ? (
        <div className="empty-state" role="status"><h2>Loading movie...</h2><p>Getting the details for this film.</p></div>
      ) : status === 'not-found' ? (
        <div className="empty-state" role="alert"><h2>Movie not found</h2><p>This movie may have been removed or the link may be incorrect.</p></div>
      ) : status === 'error' ? (
        <div className="empty-state" role="alert">
          <h2>We couldn’t load this movie</h2>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={retryLoading}>Try again</button>
        </div>
      ) : (
        <>
          <div className="movie-detail-layout">
            <div className="movie-detail-art">
              <MoviePoster
                movie={movie}
                isSaved={isSaved}
                onToggleSaved={onToggleSaved}
                showNumber={false}
              />
            </div>
            <section className="movie-detail-content">
              <span className="section-kicker">MOVIE DETAILS</span>
              <h1>{movie.title}</h1>
              <dl className="movie-detail-metadata">
                {formatReleaseDate(movie.releaseDate) && (
                  <div><dt>Release date</dt><dd>{formatReleaseDate(movie.releaseDate)}</dd></div>
                )}
                {formatDuration(movie.durationMinutes) && (
                  <div><dt>Duration</dt><dd>{formatDuration(movie.durationMinutes)}</dd></div>
                )}
                {movie.language && (
                  <div><dt>Language</dt><dd>{movie.language}</dd></div>
                )}
              </dl>
              {movie.description && <p className="movie-detail-description">{movie.description}</p>}
            </section>
          </div>
          <ShowtimesSection
            movieId={movie.id}
            authSession={authSession}
            onAuthenticated={onAuthenticated}
            onAuthenticationExpired={onAuthenticationExpired}
          />
        </>
      )}
    </main>
  )
}

function App() {
  const [movies, setMovies] = useState([])
  const [search, setSearch] = useState('')
  const [savedMovies, setSavedMovies] = useState([])
  const [notice, setNotice] = useState('')
  const [loadStatus, setLoadStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [selectedMovieId, setSelectedMovieId] = useState(getMovieIdFromHash)
  const [isBookingsPage, setIsBookingsPage] = useState(() => window.location.hash === '#bookings')
  const [authSession, setAuthSession] = useState(null)
  const previousRouteHash = useRef(
    window.location.hash && window.location.hash !== '#bookings'
      ? window.location.hash
      : '#movies',
  )

  useEffect(() => {
    const syncRoute = () => {
      setSelectedMovieId(getMovieIdFromHash())
      setIsBookingsPage(window.location.hash === '#bookings')
    }
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)

    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    getMovies({ signal: controller.signal })
      .then((loadedMovies) => {
        setMovies(loadedMovies)
        setLoadStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setLoadError(error.message || 'Unable to load movies.')
        setLoadStatus('error')
      })

    return () => controller.abort()
  }, [loadAttempt])

  const filteredMovies = useMemo(() => {
    const query = search.trim().toLowerCase()
    return movies.filter((movie) => movie.title.toLowerCase().includes(query))
  }, [movies, search])

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
    setSearch('')
  }

  function openMovie(movieId) {
    window.history.pushState(
      { movieId },
      '',
      `#movie/${encodeURIComponent(movieId)}`,
    )
    setSelectedMovieId(movieId)
    setIsBookingsPage(false)
    window.scrollTo(0, 0)
  }

  function backToMovies() {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#movies`)
    setSelectedMovieId(null)
    setIsBookingsPage(false)
    requestAnimationFrame(() => document.getElementById('movies')?.scrollIntoView())
  }

  function openBookings() {
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
    setSelectedMovieId(getMovieIdFromHash())
    window.scrollTo(0, 0)
  }

  return (
    <div className="cinevo">
      <header className="navbar">
        <a className="brand" href="#home" aria-label="Cinevo home">
          <span className="brand-mark">C</span>
          <span>cinevo<span className="brand-dot">.</span></span>
        </a>

        <nav className="nav-links">
          <a className="nav-active" href="#home">Home</a>
          <a href="#movies">Explore movies</a>
          <a href="#bookings" onClick={(event) => { event.preventDefault(); openBookings() }}>My Bookings</a>
          <a href="#about">About</a>
        </nav>

        <a className="signin-button" href="#movies">Discover films <span>↗</span></a>
      </header>

      {isBookingsPage ? (
        <MyBookings
          authSession={authSession}
          onAuthenticated={setAuthSession}
          onAuthenticationExpired={clearAuthentication}
          onBack={backFromBookings}
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
        <section className="hero">
          <div className="hero-glow" />
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> YOUR NEXT MOVIE NIGHT STARTS HERE</div>
            <h1>Stories that<br />stay with <span>you.</span></h1>
            <p className="hero-description">
              Discover unforgettable films, find your perfect showtime,
              and make every movie night count.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#movies">Explore movies <span>↗</span></a>
              <a className="secondary-button" href="#movies">Browse collection <span>↓</span></a>
            </div>
            <div className="hero-meta">
              <div><strong>01</strong><span>DISCOVER</span></div>
              <div><strong>02</strong><span>CHOOSE A SHOW</span></div>
              <div><strong>03</strong><span>ENJOY THE FILM</span></div>
            </div>
          </div>

          <div className="hero-art" aria-label="Featured movie artwork">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="featured-poster">
              <div className="poster-stars">✦ &nbsp; · &nbsp; ✧ &nbsp; · &nbsp; ✦</div>
              <div className="poster-sun" />
              <div className="poster-horizon" />
              <div className="poster-person" />
              <div className="poster-title">BEYOND<br /><span>THE</span> UNKNOWN</div>
              <div className="poster-caption">A CINEMATIC EXPERIENCE</div>
            </div>
            <div className="floating-note"><span className="note-icon">✦</span><div><strong>Find your next favourite</strong><small>One great story away</small></div></div>
            <div className="art-index">CINEVO ORIGINAL / 001</div>
          </div>
        </section>

        <section className="movies-section" id="movies">
          <div className="section-heading">
            <div><span className="section-kicker">HANDPICKED FOR YOUR NEXT NIGHT OUT</span><h2>Find your <span>next favourite.</span></h2></div>
            <span className="movie-count">{filteredMovies.length.toString().padStart(2, '0')} FILMS</span>
          </div>

          <div className="movie-toolbar">
            <label className="search-box">
              <span>⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search movies..." aria-label="Search movies" />
              {search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}
            </label>
          </div>

          {loadStatus === 'loading' ? (
            <div className="empty-state" role="status"><h3>Loading films...</h3><p>Finding your next movie night.</p></div>
          ) : loadStatus === 'error' ? (
            <div className="empty-state" role="alert">
              <h3>We couldn’t load the films</h3>
              <p>{loadError}</p>
              <button className="secondary-button" onClick={retryLoading}>Try again</button>
            </div>
          ) : movies.length === 0 ? (
            <div className="empty-state"><h3>No movies available</h3><p>There are no films to show right now. Please check back soon.</p></div>
          ) : filteredMovies.length ? (
            <div className={filteredMovies.length === 1 ? 'movie-grid single-result' : 'movie-grid'}>
              {filteredMovies.map((movie, index) => (
                <article className="movie-card" key={movie.id}>
                  <MoviePoster
                    movie={movie}
                    index={index}
                    isSaved={savedMovies.includes(movie.id)}
                    onToggleSaved={() => toggleSaved(movie.id)}
                  />
                  <div className="movie-info">
                    <div className="movie-title-row"><h3>{movie.title}</h3></div>
                    <p>
                      {[getReleaseYear(movie.releaseDate), formatDuration(movie.durationMinutes), movie.language]
                        .filter(Boolean)
                        .map((detail, detailIndex) => (
                          <span key={`${movie.id}-${detailIndex}`}>
                            {detailIndex > 0 && <span className="metadata-separator"> · </span>}
                            {detail}
                          </span>
                        ))}
                    </p>
                    {movie.description && <p className="movie-description">{movie.description}</p>}
                    <button className="book-button" onClick={() => openMovie(movie.id)}>View movie <span>↗</span></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state"><span>⌕</span><h3>No films found</h3><p>Try another title.</p><button className="secondary-button" onClick={clearSearch}>Clear search</button></div>
          )}
          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
        </section>

        <section className="closing-banner" id="about">
          <div><span className="section-kicker">YOUR SEAT IS WAITING</span><h2>Great films. <span>Better nights.</span></h2></div>
          <a className="primary-button" href="#movies">Find a film <span>↗</span></a>
        </section>
      </main>
      )}

      <footer className="footer">
        <a className="brand" href="#home"><span className="brand-mark">C</span><span>cinevo<span className="brand-dot">.</span></span></a>
        <p>Made for the love of cinema.</p>
        <span>© 2026 CINEVO</span>
      </footer>
    </div>
  )
}

export default App
