import React, { useState } from 'react'


const Input = ({ 
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  className = '',
  showPasswordToggle = false,
  ...props 
}) => {
  
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  
  // Determine actual input type (handle password visibility toggle)
  const inputType = type === 'password' && showPassword ? 'text' : type
  
  // Base input styles using Flik'd theme colors
  const baseInputStyles = 'w-full px-4 py-3.5 border-2 rounded-xl font-inter text-flikd-white placeholder:text-gray-500 bg-flikd-black/50 backdrop-blur-sm transition-all duration-200 focus:outline-none'
  
  // State-based styles
  const stateStyles = error 
    ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/20' 
    : isFocused
    ? 'border-flikd-gold focus:ring-4 focus:ring-flikd-gold/10'
    : 'border-flikd-grey hover:border-flikd-gold/50'
  
  // Disabled styles
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : ''
  
  // Icon padding adjustments
  const iconPaddingLeft = icon && iconPosition === 'left' ? 'pl-12' : ''
  const iconPaddingRight = (icon && iconPosition === 'right') || (showPasswordToggle && type === 'password') ? 'pr-12' : ''
  
  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className='font-inter text-sm font-semibold text-flikd-white/80 block mb-2'>
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>
      )}
      
      <div className='relative'>
        {/* Left Icon */}
        {icon && iconPosition === 'left' && (
          <div className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none'>
            {icon}
          </div>
        )}
        
        {/* Input Field */}
        <input
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`${baseInputStyles} ${stateStyles} ${disabledStyles} ${iconPaddingLeft} ${iconPaddingRight}`}
          {...props}
        />
        
        {/* Right Icon or Password Toggle */}
        {showPasswordToggle && type === 'password' ? (
          <button
            type='button'
            onClick={() => setShowPassword(!showPassword)}
            className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-flikd-gold transition-colors'
            disabled={disabled}
            tabIndex={-1}
          >
            {showPassword ? (
              // Eye Icon (visible)
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
              </svg>
            ) : (
              // Eye Off Icon (hidden)
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
              </svg>
            )}
          </button>
        ) : icon && iconPosition === 'right' ? (
          <div className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none'>
            {icon}
          </div>
        ) : null}
      </div>
      
      {/* Helper Text or Error Message */}
      {(helperText || error) && (
        <p className={`font-inter text-sm mt-2 ${error ? 'text-red-500' : 'text-flikd-white/60'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  )
}

export default Input