import { SignIn as ClerkSignIn } from "@clerk/clerk-react";

// All three personas authenticate the same way: phone number + SMS OTP.
// We wrap Clerk's robust phone-OTP flow (handles resend, rate-limit,
// new-vs-existing) in the TOTO splash chrome rather than hand-rolling it.
export default function SignIn() {
  return (
    <div className="screen">
      <div className="bar"><span style={{ fontWeight: 700 }}>Welcome</span><span className="wordmark">TOTO</span></div>
      <div className="pad" style={{ paddingTop: 8 }}>
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div className="sp-word" style={{ fontSize: 40 }}>TOTO</div>
          <div className="sp-tag" style={{ fontSize: 13 }}>
            <span className="c">Compete… </span>
            <span className="d">मगर प्यार से</span>
          </div>
        </div>
        <p className="sub" style={{ textAlign: "center" }}>
          Sign in with your phone — we text a one-time code. Players, organizers and admins all sign in the same way.
        </p>
        <div className="center">
          <ClerkSignIn
            routing="virtual"
            signUpUrl="#"
            fallbackRedirectUrl="/"
          />
        </div>
      </div>
    </div>
  );
}
