# Login Functionality Test Plan

## Overview
This test plan covers the functional testing of the login feature for the Demo App. The scope includes authentication workflows, form validation, navigation, and user interface behavior. This plan excludes performance, security, UX, and load testing aspects.

## Application Under Test
- **Component**: Login Page (`/login/index.html`)
- **Authentication Logic**: Client-side validation accepting any non-empty username and password
- **Success Redirect**: Main Dashboard (`/mainPage/index.html`)
- **Session Management**: Username stored in sessionStorage

## Test Scope

### In Scope
- Login form functionality
- Input field validation
- Authentication logic
- Success and error message display
- Navigation and redirection
- Form submission behavior
- Accessibility attributes
- Keyboard navigation

### Out of Scope
- Performance testing
- Security testing (XSS, SQL injection, etc.)
- Load testing
- User experience testing
- Browser compatibility testing
- Mobile responsiveness testing

## Test Categories

### 1. Functional Tests

#### 1.1 Successful Login Scenarios
| Test ID | Test Description | Steps | Expected Result |
|---------|------------------|-------|-----------------|
| TC001 | Login with valid username and password | 1. Navigate to login page<br>2. Enter non-empty username<br>3. Enter non-empty password<br>4. Click "Sign In" button | User is successfully authenticated and redirected to dashboard |
| TC002 | Login with alphanumeric username | 1. Navigate to login page<br>2. Enter "user123"<br>3. Enter "password"<br>4. Submit form | Login successful, redirected to dashboard |
| TC003 | Login with special characters in credentials | 1. Navigate to login page<br>2. Enter "user@domain.com"<br>3. Enter "Pass@123!"<br>4. Submit form | Login successful, redirected to dashboard |
| TC004 | Login with single character credentials | 1. Navigate to login page<br>2. Enter "a"<br>3. Enter "b"<br>4. Submit form | Login successful, redirected to dashboard |
| TC005 | Login with maximum length credentials | 1. Navigate to login page<br>2. Enter very long username (255+ chars)<br>3. Enter very long password (255+ chars)<br>4. Submit form | Login successful, redirected to dashboard |

#### 1.2 Failed Login Scenarios
| Test ID | Test Description | Steps | Expected Result |
|---------|------------------|-------|-----------------|
| TC006 | Login with empty username | 1. Navigate to login page<br>2. Leave username field empty<br>3. Enter valid password<br>4. Submit form | Error message displayed, form not submitted |
| TC007 | Login with empty password | 1. Navigate to login page<br>2. Enter valid username<br>3. Leave password field empty<br>4. Submit form | Error message displayed, form not submitted |
| TC008 | Login with both fields empty | 1. Navigate to login page<br>2. Leave both fields empty<br>3. Submit form | Error message displayed, form not submitted |
| TC009 | Login with whitespace-only username | 1. Navigate to login page<br>2. Enter only spaces in username<br>3. Enter valid password<br>4. Submit form | Error message displayed (whitespace trimmed) |
| TC010 | Login with whitespace-only password | 1. Navigate to login page<br>2. Enter valid username<br>3. Enter only spaces in password<br>4. Submit form | Error message displayed (whitespace trimmed) |

### 2. User Interface Tests

#### 2.1 Page Elements and Layout
| Test ID | Test Description | Expected Result |
|---------|------------------|-----------------|
| TC011 | Verify login page loads correctly | Page displays with title "Login - Demo App", form, and all required elements |
| TC012 | Verify form elements are present | Username field, password field, "Sign In" button are visible |
| TC013 | Verify page heading | "Welcome Back" heading is displayed |
| TC014 | Verify input field labels | Username and password fields have proper labels |
| TC015 | Verify button text | Login button displays "Sign In" text |

#### 2.2 Form Behavior
| Test ID | Test Description | Steps | Expected Result |
|---------|------------------|-------|-----------------|
| TC016 | Verify loading state during login | 1. Enter credentials<br>2. Submit form<br>3. Observe button state | Button shows "Signing in..." text and loading state |
| TC017 | Verify success state animation | 1. Enter valid credentials<br>2. Submit form<br>3. Wait for success | Button shows checkmark and "Success!" text |
| TC018 | Verify error state animation | 1. Submit empty form<br>2. Observe error state | Button shows error state, form shakes animation |
| TC019 | Verify form reset after error | 1. Submit invalid form<br>2. Wait 2 seconds<br>3. Observe button | Button resets to "Sign In" text |
| TC020 | Verify input focus effects | 1. Click on username field<br>2. Click on password field | Input groups show focused state styling |

### 3. Message Display Tests

#### 3.1 Error Messages
| Test ID | Test Description | Steps | Expected Result |
|---------|------------------|-------|-----------------|
| TC021 | Verify error message display | 1. Submit form with empty fields<br>2. Check error message | "Invalid username or password. Please try again." is displayed |
| TC022 | Verify error message styling | 1. Trigger error message<br>2. Inspect styling | Error message has proper styling and is visible |
| TC023 | Verify error message accessibility | 1. Trigger error message<br>2. Check ARIA attributes | Error message has role="alert" and aria-live="assertive" |

#### 3.2 Success Messages
| Test ID | Test Description | Steps | Expected Result |
|---------|------------------|-------|-----------------|
| TC024 | Verify success message display | 1. Login with valid credentials<br>2. Check success message | "Login successful! Redirecting..." is displayed |
| TC025 | Verify success message timing | 1. Complete successful login<br>2. Time the redirect | Success message shows for ~1.5 seconds before redirect |
| TC026 | Verify success message accessibility | 1. Complete successful login<br>2. Check ARIA attributes | Success message has role="status" and aria-live="polite" |

### 4. Navigation Tests

#### 4.1 Redirection
| Test ID | Test Description | Steps | Expected Result |
|---------|------------------|-------|-----------------|
| TC027 | Verify successful login redirect | 1. Login with valid credentials<br>2. Wait for redirect | User is redirected to `/mainPage/index.html` |
| TC028 | Verify redirect timing | 1. Complete login<br>2. Measure redirect time | Redirect occurs after 1.5 seconds |
| TC029 | Verify session storage | 1. Login successfully<br>2. Check sessionStorage | Username is stored in sessionStorage as 'loggedInUser' |
| TC030 | Verify dashboard access | 1. Complete login<br>2. Verify dashboard page | Dashboard page loads with user welcome message |

### 5. Form Validation Tests

#### 5.1 Input Validation
| Test ID | Test Description | Steps | Expected Result |
|---------|------------------|-------|-----------------|
| TC031 | Verify username field validation | 1. Focus on username field<br>2. Leave empty and blur | Field shows invalid state when empty |
| TC032 | Verify password field validation | 1. Focus on password field<br>2. Leave empty and blur | Field shows invalid state when empty |
| TC033 | Verify valid input styling | 1. Enter text in username<br>2. Enter text in password | Fields show valid state styling |
| TC034 | Verify floating labels | 1. Focus on input fields<br>2. Enter text | Labels float and remain visible |
| TC035 | Verify input autocomplete | 1. Check input attributes | Username has autocomplete="username", password has autocomplete="current-password" |

### 6. Accessibility Tests

#### 6.1 ARIA Attributes
| Test ID | Test Description | Expected Result |
|---------|------------------|-----------------|
| TC036 | Verify form accessibility structure | Form has proper ARIA labels and roles |
| TC037 | Verify input field ARIA attributes | Inputs have aria-describedby and aria-invalid attributes |
| TC038 | Verify button accessibility | Login button has proper ARIA attributes |
| TC039 | Verify error message accessibility | Error messages have proper ARIA live regions |
| TC040 | Verify screen reader support | Form is properly announced by screen readers |

#### 6.2 Keyboard Navigation
| Test ID | Test Description | Steps | Expected Result |
|---------|------------------|-------|-----------------|
| TC041 | Verify tab navigation | 1. Use Tab key to navigate<br>2. Check focus order | Focus moves: username → password → login button |
| TC042 | Verify Enter key submission | 1. Enter credentials<br>2. Press Enter in any field | Form submits successfully |
| TC043 | Verify Ctrl+Enter submission | 1. Enter credentials<br>2. Press Ctrl+Enter | Form submits successfully |
| TC044 | Verify keyboard accessibility | 1. Navigate using only keyboard<br>2. Complete login process | All functionality accessible via keyboard |

### 7. Browser Behavior Tests

#### 7.1 Form Submission
| Test ID | Test Description | Steps | Expected Result |
|---------|------------------|-------|-----------------|
| TC045 | Verify form prevents default submission | 1. Submit form<br>2. Check page behavior | Page doesn't refresh, JavaScript handles submission |
| TC046 | Verify novalidate attribute | 1. Check form element<br>2. Submit with empty fields | Browser validation is disabled, custom validation used |
| TC047 | Verify multiple submissions prevention | 1. Submit form<br>2. Try to submit again during loading | Subsequent submissions are prevented during loading |

## Test Environment Requirements

### Prerequisites
- Web server running on localhost
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Network connectivity for external resources (fonts, etc.)

### Test Data
- Valid credentials: Any non-empty string for both username and password
- Invalid credentials: Empty strings or whitespace-only strings

## Test Execution Strategy

### Manual Testing
- Execute test cases TC001-TC047 manually
- Document results in test execution log
- Report any deviations from expected behavior

### Automated Testing
- Use existing Playwright page object model (`page-objects/LoginPage.js`)
- Implement test cases as Playwright test specs
- Run tests across different browser engines
- Generate test reports

## Test Deliverables

1. **Test Execution Report**: Results of all test cases
2. **Bug Report**: Any defects found during testing
3. **Test Coverage Report**: Percentage of functionality covered
4. **Automation Scripts**: Playwright test implementations

## Success Criteria

- All test cases pass with expected results
- No critical or high-priority defects found
- Login functionality works consistently across test scenarios
- Form validation behaves correctly
- Accessibility requirements are met
- Navigation and redirection work as expected

## Risk Assessment

### High Risk Areas
- Form validation logic
- Session management
- Redirection timing
- Error message display

### Medium Risk Areas
- UI state management
- Accessibility compliance
- Keyboard navigation

### Low Risk Areas
- Static page elements
- Basic form submission
- CSS styling

---

**Document Version**: 1.0  
**Created Date**: July 31, 2025  
**Last Updated**: July 31, 2025  
**Test Plan Owner**: QA Team
