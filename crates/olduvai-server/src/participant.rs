//! Who is asking.
//!
//! # ⚠️ The participant is read from the header, never from the body
//!
//! Every route below takes the participant from `Authorization: Bearer <token>` and from
//! nowhere else. That is not ceremony. An observation is appended to *someone's* log, and if
//! the name came from the request body then any caller could append a fix to any other
//! participant's position — the fold would be perfectly correct arithmetic over a log that
//! someone else had written.
//!
//! ⚠️ **This is not authentication and does not claim to be.** `web/src/lib/api/session.js`
//! says the same thing from the other end: identity on the exchange is a *ledger participant*,
//! and that service does not exist. The token here is treated as an opaque participant key,
//! which is exactly as strong as the cookie that carries it — which is to say, not at all.
//!
//! What this file *does* buy, before that service exists, is that the shape is already right:
//! the day tokens are verified, [`Participant::from_headers`] changes and no route does. A
//! design that read the name from the body would have to change every route instead, and the
//! ones that were missed would be the vulnerability.

use axum::http::HeaderMap;

/// The participant a request is acting as.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Participant(String);

impl Participant {
    /// Read the bearer token as a participant key.
    ///
    /// Returns `None` when the header is absent, malformed, or empty — all of which are the
    /// same thing to a caller: there is nobody to attribute this to.
    ///
    /// ⚠️ The token is **not decoded**. It is used whole, as an opaque key. Parsing structure
    /// out of it here would be inventing a claim format that nothing issues, and a route that
    /// trusts an unverified claim is worse than one that trusts an unverified opaque string,
    /// because the claim looks like it was checked.
    pub fn from_headers(headers: &HeaderMap) -> Option<Participant> {
        let raw = headers.get(axum::http::header::AUTHORIZATION)?.to_str().ok()?;
        let token = raw.strip_prefix("Bearer ").or_else(|| raw.strip_prefix("bearer "))?;
        let token = token.trim();
        if token.is_empty() {
            return None;
        }
        Some(Participant(token.to_string()))
    }

    pub fn key(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{header::AUTHORIZATION, HeaderMap, HeaderValue};

    fn headers(value: &str) -> HeaderMap {
        let mut h = HeaderMap::new();
        h.insert(AUTHORIZATION, HeaderValue::from_str(value).unwrap());
        h
    }

    #[test]
    fn a_bearer_token_names_a_participant() {
        let p = Participant::from_headers(&headers("Bearer farm-1")).unwrap();
        assert_eq!(p.key(), "farm-1");
    }

    #[test]
    fn the_scheme_is_case_insensitive_but_the_token_is_not() {
        assert_eq!(
            Participant::from_headers(&headers("bearer Farm-1")).unwrap().key(),
            "Farm-1"
        );
    }

    #[test]
    fn no_header_is_no_participant() {
        assert_eq!(Participant::from_headers(&HeaderMap::new()), None);
    }

    #[test]
    fn a_bare_token_without_the_scheme_is_rejected() {
        // ⚠️ Accepting this would make `Authorization: farm-1` work, which is a different
        // wire format arriving by accident rather than by decision.
        assert_eq!(Participant::from_headers(&headers("farm-1")), None);
    }

    #[test]
    fn an_empty_token_is_no_participant() {
        assert_eq!(Participant::from_headers(&headers("Bearer ")), None);
        assert_eq!(Participant::from_headers(&headers("Bearer    ")), None);
    }
}
