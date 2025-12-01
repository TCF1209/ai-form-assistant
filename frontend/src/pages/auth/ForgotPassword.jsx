import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

// Icons
const MailIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/password-reset/', { email });
      setSubmitted(true);
    } catch (err) {
      // Even on error, show success message for security (don't reveal if email exists)
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <CheckCircleIcon />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Check your email
          </h2>
          <p className="text-slate-600 mb-6">
            If an account exists for <span className="font-medium text-slate-800">{email}</span>,
            we've sent password reset instructions to your inbox.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Didn't receive the email? Check your spam folder or try again with a different email address.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
              className="w-full py-2 px-4 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Try another email
            </button>
            <Link
              to="/login"
              className="w-full py-2 px-4 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors text-sm font-medium flex items-center justify-center"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full space-y-6">
        <div>
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-slate-600 hover:text-sky-500 transition-colors mb-4"
          >
            <ArrowLeftIcon />
            <span className="ml-2">Back to Sign In</span>
          </Link>

          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-sky-500 rounded-lg flex items-center justify-center">
              <MailIcon className="text-white" />
            </div>
          </div>

          <h2 className="text-center text-2xl font-bold text-slate-800">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            No worries! Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              className={`appearance-none relative block w-full px-3 py-2 border ${
                error ? 'border-red-500' : 'border-slate-300'
              } placeholder-slate-400 text-slate-800 rounded-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm`}
              placeholder="Enter your email address"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              'Send Reset Instructions'
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-slate-500">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-sky-500 hover:text-sky-600">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
