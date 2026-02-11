import React from 'react'

/**
 * Button Component for Flik'd Application
 * 
 * A versatile button component following the Flik'd brand system
 * Colors: Gold (#D4AF37), Black (#0A0A0A), Grey (#0B375B), White (#FFFFFF)
 * Typography: Inter font family
 * 
 * @param {string} variant - Button style: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
 * @param {string} size - Button size: 'sm' | 'md' | 'lg'
 * @param {boolean} fullWidth - Whether button should take full width
 * @param {boolean} disabled - Disable button interaction
 * @param {boolean} loading - Show loading spinner
 * @param {ReactNode} icon - Optional icon element
 * @param {string} iconPosition - Icon placement: 'left' | 'right'
 * @param {function} onClick - Click handler
 * @param {string} type - Button type: 'button' | 'submit' | 'reset'
 * @param {string} className - Additional CSS classes
 */

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  ...props 
}) => {
  
  // Base styles shared across all variants
  const baseStyles = 'font-inter font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
  
  // Variant-specific styles using Flik'd theme colors
  const variants = {
    primary: 'bg-gradient-to-r from-flikd-gold to-yellow-500 text-flikd-black hover:shadow-xl hover:shadow-flikd-gold/30 transform hover:-translate-y-0.5 active:translate-y-0 focus:ring-flikd-gold/20',
    secondary: 'border-2 border-flikd-gold text-flikd-gold bg-transparent hover:bg-flikd-gold/10 focus:ring-flikd-gold/20',
    ghost: 'text-flikd-white bg-transparent hover:bg-flikd-white/10 focus:ring-flikd-white/20',
    danger: 'bg-red-500 text-flikd-white hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/30 transform hover:-translate-y-0.5 active:translate-y-0 focus:ring-red-500/20',
    outline: 'border-2 border-flikd-grey text-flikd-white bg-transparent hover:bg-flikd-grey/50 hover:border-flikd-gold focus:ring-flikd-grey/20'
  }
  
  // Size-specific styles
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }
  
  // Full width class
  const widthClass = fullWidth ? 'w-full' : ''
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          {/* Loading Spinner */}
          <svg className='animate-spin h-5 w-5' fill='none' viewBox='0 0 24 24'>
            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {/* Left Icon */}
          {icon && iconPosition === 'left' && <span className='flex-shrink-0'>{icon}</span>}
          
          {/* Button Content */}
          <span>{children}</span>
          
          {/* Right Icon */}
          {icon && iconPosition === 'right' && <span className='flex-shrink-0'>{icon}</span>}
        </>
      )}
    </button>
  )
}

export default Button