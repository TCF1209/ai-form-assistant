import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword } from '../../utils/validators';

// Eye icons for password visibility toggle
const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const Register = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });

  const [errors, setErrors] = useState({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else {
      const emailError = validateEmail(formData.email);
      if (emailError) {
        newErrors.email = emailError;
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        newErrors.password = passwordError;
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // First name validation
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    // Last name validation
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    // Terms acceptance
    if (!acceptTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare data for API
    const registrationData = {
      username: formData.email.split('@')[0], // Generate username from email
      email: formData.email,
      password: formData.password,
      password_confirm: formData.confirmPassword, // Add password_confirm field
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone_number: formData.phoneNumber || '', // Send empty string instead of null
    };

    const result = await register(registrationData);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      // Handle field-specific errors from the backend
      const backendErrors = {};

      if (result.error) {
        // Check for field-specific errors
        if (result.error.email) {
          backendErrors.email = result.error.email[0];
        }
        if (result.error.username) {
          backendErrors.general = result.error.username[0];
        }
        if (result.error.password) {
          backendErrors.password = result.error.password[0];
        }
        if (result.error.password_confirm) {
          backendErrors.confirmPassword = result.error.password_confirm[0];
        }
        if (result.error.first_name) {
          backendErrors.firstName = result.error.first_name[0];
        }
        if (result.error.last_name) {
          backendErrors.lastName = result.error.last_name[0];
        }
        if (result.error.detail) {
          backendErrors.general = result.error.detail;
        }

        // If no specific errors, show a general error
        if (Object.keys(backendErrors).length === 0) {
          backendErrors.general = 'Registration failed. Please try again.';
        }
      } else {
        backendErrors.general = 'Registration failed. Please try again.';
      }

      setErrors(backendErrors);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 space-y-6">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-slate-800">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-sky-500 hover:text-sky-600"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.firstName ? 'border-red-300' : 'border-slate-300'
                  } rounded-md placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.lastName ? 'border-red-300' : 'border-slate-300'
                  } rounded-md placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm`}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-slate-300'
                } rounded-md placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm`}
                placeholder="john.doe@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700">
                Phone Number (Optional)
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-300 rounded-md placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.password ? 'border-red-300' : 'border-slate-300'
                  } rounded-md placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                Confirm Password
              </label>
              <div className="relative mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-slate-300'
                  } rounded-md placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center">
              <input
                id="accept-terms"
                name="accept-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-slate-300 rounded"
              />
              <label htmlFor="accept-terms" className="ml-2 block text-sm text-slate-700">
                I accept the{' '}
                <Link to="/terms" className="text-sky-500 hover:text-sky-600">
                  Terms and Conditions
                </Link>
              </label>
            </div>
            {errors.terms && (
              <p className="mt-1 text-sm text-red-600">{errors.terms}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
