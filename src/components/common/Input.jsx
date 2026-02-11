import React, { useState, useRef } from 'react'

/**
 * Enhanced Input Component for Flik'd Application
 * 
 * A flexible and accessible form input component with variants, sizes, and enhanced features
 * 
 * Brand Colors:
 * - Gold: #D4AF37 (Primary accent)
 * - Black: #0A0A0A (Background)
 * - Grey: #0B375B (Secondary)
 * - White: #FFFFFF (Text)
 * 
 * Typography: Inter font family
 * 
 * @param {string} label - Label text for the input
 * @param {string} type - Input type
 * @param {string} variant - 'outlined' | 'filled' | 'ghost' (default: 'outlined')
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} name - Input name attribute
 * @param {string} value - Input value
 * @param {function} onChange - Change handler
 * @param {string} placeholder - Placeholder text
 * @param {string} error - Error message to display
 * @param {string} success - Success message to display
 * @param {string} helperText - Helper text below input
 * @param {boolean} required - Whether input is required
 * @param {boolean} disabled - Whether input is disabled
 * @param {ReactNode} icon - Optional icon element
 * @param {string} iconPosition - 'left' | 'right' (default: 'left')
 * @param {boolean} showPasswordToggle - Show password visibility toggle
 * @param {boolean} fullWidth - Take full width of container (default: true)
 * @param {boolean} floatingLabel - Enable floating label animation (default: false)
 * @param {string} className - Additional CSS classes
 * @param {string} inputClassName - Additional classes for input element
 * @param {function} onKeyPress - Key press handler
 * @param {function} onFocus - Focus handler
 * @param {function} onBlur - Blur handler
 * @param {number} maxLength - Maximum character length
 * @param {string} autoComplete - Autocomplete attribute
 */

const Input = ({ 
  label,
  type = 'text',
  variant = 'outlined',
  size = 'md',
  name,
  value,
  onChange,
  placeholder,
  error,
  success,
  helperText,
  required = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  showPasswordToggle = false,
  fullWidth = true,
  floatingLabel = false,
  className = '',
  inputClassName = '',
  onKeyPress,
  onFocus,
  onBlur,
  maxLength,
  autoComplete,
  ...props 
}) => {
  
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)
  
  // Determine if label should float
  const shouldFloatLabel = floatingLabel && (isFocused || value)
  
  // Determine actual input type
  const inputType = type === 'password' && showPassword ? 'text' : type
  
  // Size variants
  const sizeStyles = {
    sm: {
      input: 'px-3 py-2 text-sm rounded-lg',
      icon: 'w-4 h-4',
      label: 'text-xs',
      helper: 'text-xs',
    },
    md: {
      input: 'px-4 py-3 text-base rounded-xl',
      icon: 'w-5 h-5',
      label: 'text-sm',
      helper: 'text-sm',
    },
    lg: {
      input: 'px-5 py-4 text-lg rounded-xl',
      icon: 'w-6 h-6',
      label: 'text-base',
      helper: 'text-sm',
    },
  }
  
  // Variant styles
  const variantStyles = {
    outlined: {
      base: 'bg-transparent border-2',
      idle: 'border-flikd-grey',
      focus: 'border-flikd-gold ring-4 ring-flikd-gold/10',
      hover: 'hover:border-flikd-gold/50',
      error: 'border-red-500 focus:border-red-500 ring-4 ring-red-500/20',
      success: 'border-green-500 focus:border-green-500 ring-4 ring-green-500/20',
    },
    filled: {
      base: 'bg-flikd-black/80 backdrop-blur-sm border-2 border-transparent',
      idle: '',
      focus: 'border-flikd-gold ring-4 ring-flikd-gold/10',
      hover: 'hover:bg-flikd-black/90',
      error: 'border-red-500 ring-4 ring-red-500/20',
      success: 'border-green-500 ring-4 ring-green-500/20',
    },
    ghost: {
      base: 'bg-transparent border-2 border-transparent',
      idle: '',
      focus: 'border-flikd-gold/30 bg-flikd-black/20',
      hover: 'hover:bg-flikd-black/10',
      error: 'border-red-500/30 bg-red-500/5',
      success: 'border-green-500/30 bg-green-500/5',
    },
  }
  
  // Get current variant styles
  const currentVariant = variantStyles[variant]
  
  // Base input styles
  const baseInputStyles = `
    w-full font-inter text-flikd-white 
    placeholder:text-gray-500 
    transition-all duration-200 
    focus:outline-none
    ${sizeStyles[size].input}
    ${currentVariant.base}
  `
  
  // State-based styles
  const getStateStyles = () => {
    if (error) return currentVariant.error
    if (success) return currentVariant.success
    if (isFocused) return currentVariant.focus
    return `${currentVariant.idle} ${currentVariant.hover}`
  }
  
  // Disabled styles
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'
  
  // Icon padding
  const getIconPadding = () => {
    const iconPadding = {
      sm: { left: 'pl-9', right: 'pr-9' },
      md: { left: 'pl-11', right: 'pr-11' },
      lg: { left: 'pl-13', right: 'pr-13' },
    }
    
    let paddingLeft = ''
    let paddingRight = ''
    
    if (icon && iconPosition === 'left') paddingLeft = iconPadding[size].left
    if (icon && iconPosition === 'right') paddingRight = iconPadding[size].right
    if (showPasswordToggle && type === 'password') paddingRight = iconPadding[size].right
    
    return `${paddingLeft} ${paddingRight}`
  }
  
  // Icon position classes
  const iconPositionClass = iconPosition === 'left' ? 'left-3' : 'right-3'
  
  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus && onFocus(e)
  }
  
  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur && onBlur(e)
  }
  
  // Generate unique ID for accessibility
  const inputId = name || `input-${Math.random().toString(36).substr(2, 9)}`
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {/* Label (non-floating) */}
      {label && !floatingLabel && (
        <label 
          htmlFor={inputId}
          className={`font-inter font-semibold text-flikd-white/90 block mb-2 ${sizeStyles[size].label}`}
        >
          {label}
          {required && <span className='text-flikd-gold ml-1'>*</span>}
        </label>
      )}
      
      <div className='relative'>
        {/* Floating Label */}
        {label && floatingLabel && (
          <label 
            htmlFor={inputId}
            className={`
              absolute left-4 font-inter font-medium text-gray-400
              transition-all duration-200 pointer-events-none
              ${shouldFloatLabel 
                ? '-top-2.5 text-xs bg-flikd-black/90 px-2 text-flikd-gold' 
                : `top-1/2 -translate-y-1/2 ${sizeStyles[size].label}`
              }
              ${disabled ? 'opacity-50' : ''}
            `}
          >
            {label}
            {required && <span className='text-flikd-gold ml-1'>*</span>}
          </label>
        )}
        
        {/* Left Icon */}
        {icon && iconPosition === 'left' && (
          <div className={`
            absolute ${iconPositionClass} top-1/2 -translate-y-1/2 
            text-gray-400 pointer-events-none
            transition-colors duration-200
            ${isFocused ? 'text-flikd-gold' : ''}
            ${error ? 'text-red-500' : ''}
            ${success ? 'text-green-500' : ''}
          `}>
            <div className={sizeStyles[size].icon}>
              {icon}
            </div>
          </div>
        )}
        
        {/* Input Field */}
        <input
          ref={inputRef}
          id={inputId}
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyPress={onKeyPress}
          placeholder={floatingLabel ? '' : placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`
            ${baseInputStyles} 
            ${getStateStyles()} 
            ${disabledStyles} 
            ${getIconPadding()}
            ${inputClassName}
          `}
          {...props}
        />
        
        {/* Right Icon */}
        {icon && iconPosition === 'right' && !showPasswordToggle && (
          <div className={`
            absolute ${iconPositionClass} top-1/2 -translate-y-1/2 
            text-gray-400 pointer-events-none
            transition-colors duration-200
            ${isFocused ? 'text-flikd-gold' : ''}
            ${error ? 'text-red-500' : ''}
            ${success ? 'text-green-500' : ''}
          `}>
            <div className={sizeStyles[size].icon}>
              {icon}
            </div>
          </div>
        )}
        
        {/* Password Toggle */}
        {showPasswordToggle && type === 'password' && (
          <button
            type='button'
            onClick={() => setShowPassword(!showPassword)}
            className={`
              absolute right-3 top-1/2 -translate-y-1/2 
              text-gray-400 hover:text-flikd-gold 
              transition-colors duration-200
              focus:outline-none focus:text-flikd-gold
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
            disabled={disabled}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <div className={sizeStyles[size].icon}>
              {showPassword ? (
                <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                </svg>
              ) : (
                <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                </svg>
              )}
            </div>
          </button>
        )}
        
        {/* Success Icon (optional) */}
        {success && !showPasswordToggle && (
          <div className='absolute right-3 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none'>
            <div className={sizeStyles[size].icon}>
              <svg fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {/* Character Count */}
      {maxLength && (
        <div className='flex justify-end mt-1'>
          <span className={`${sizeStyles[size].helper} text-flikd-white/40`}>
            {value?.length || 0}/{maxLength}
          </span>
        </div>
      )}
      
      {/* Helper Text, Error, or Success Message */}
      {(helperText || error || success) && (
        <p 
          id={error ? errorId : helperId}
          className={`
            font-inter mt-2 flex items-start gap-1
            ${sizeStyles[size].helper}
            ${error ? 'text-red-500' : success ? 'text-green-500' : 'text-flikd-white/60'}
          `}
        >
          {error && (
            <svg className='w-4 h-4 mt-0.5 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd' />
            </svg>
          )}
          {success && (
            <svg className='w-4 h-4 mt-0.5 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd' />
            </svg>
          )}
          <span>{error || success || helperText}</span>
        </p>
      )}
    </div>
  )
}

export default Input