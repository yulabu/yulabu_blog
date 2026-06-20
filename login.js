// 全局始终开启的监听器，只读文档内容
document.addEventListener('DOMContentLoaded', function() {
    // get form elements
    const container = document.querySelector('.container')
    const form = container.querySelector('form')
    const usernameInput = form.querySelector('input[type="text"]')
    const passwordInput = form.querySelector('input[type="password"]')
    const submitButton = form.querySelector('button[type="submit"]')

    // my account credentials
    const validUsername = 'admin'
    const validPassword = '123'

    // handle form submission
    form.addEventListener('submit', function(event) {
        event.preventDefault() // prevent form from submitting

        const username = usernameInput.value.trim()
        const password = passwordInput.value.trim()
        if (!username || !password) {
            alert('Please enter both username and password.')
            return 
        }
        if (username === validUsername && password === validPassword) {
            alert('Login successful!')
        } else {
            alert('Invalid username or password.')
        }
    })
})