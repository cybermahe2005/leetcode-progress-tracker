document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const fetchButton = document.getElementById('fetchButton');
    const usernameInput = document.getElementById('usernameInput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const statsSection = document.getElementById('statsSection');
    const errorMessage = document.getElementById('errorMessage');
    
    // Theme toggle functionality
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        themeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
    });
    
    // Fetch data button functionality
    fetchButton.addEventListener('click', function() {
        const username = usernameInput.value.trim();
        if (username) {
            fetchUserData(username);
        } else {
            showError('Please enter a LeetCode username');
        }
    });

    // Allow pressing Enter to submit
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            fetchButton.click();
        }
    });
    
    // Function to show error messages
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    // CORS proxy URL - you may need to set up your own proxy server
    const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
    // Alternative: use a different CORS proxy or set up your own
    
    // Fetch user data from LeetCode GraphQL API using CORS proxy
    async function fetchUserData(username) {
        loadingIndicator.style.display = 'block';
        statsSection.style.opacity = '0.5';
        fetchButton.disabled = true;
        errorMessage.style.display = 'none';
        
        try {
            // First, get the user's recent submissions and problem counts
            const userProfileQuery = {
                query: `
                    query getUserProfile($username: String!) {
                        allQuestionsCount {
                            difficulty
                            count
                        }
                        matchedUser(username: $username) {
                            username
                            submitStats {
                                acSubmissionNum {
                                    difficulty
                                    count
                                    submissions
                                }
                            }
                        }
                    }
                `,
                variables: { username }
            };

            // Using CORS proxy to bypass the CORS error
            const userProfileResponse = await fetch(CORS_PROXY + 'https://leetcode.com/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(userProfileQuery)
            });

            if (!userProfileResponse.ok) {
                // If the proxy fails, try direct request (might still fail due to CORS)
                throw new Error('Failed to fetch user data through proxy');
            }

            const userProfileData = await userProfileResponse.json();
            
            if (userProfileData.errors) {
                throw new Error(userProfileData.errors[0].message);
            }
            
            if (!userProfileData.data.matchedUser) {
                throw new Error('User not found');
            }
            
            // Extract problem counts
            const allQuestions = userProfileData.data.allQuestionsCount;
            const acSubmissions = userProfileData.data.matchedUser.submitStats.acSubmissionNum;
            
            // Update problem counts
            const totalProblems = allQuestions.find(q => q.difficulty === 'All').count;
            const totalEasy = allQuestions.find(q => q.difficulty === 'Easy').count;
            const totalMedium = allQuestions.find(q => q.difficulty === 'Medium').count;
            const totalHard = allQuestions.find(q => q.difficulty === 'Hard').count;
            
            document.getElementById('totalProblems').textContent = totalProblems;
            document.getElementById('totalEasy').textContent = totalEasy;
            document.getElementById('totalMedium').textContent = totalMedium;
            document.getElementById('totalHard').textContent = totalHard;
            
            // Update solved counts
            const totalSolved = acSubmissions.find(q => q.difficulty === 'All').count;
            const easySolved = acSubmissions.find(q => q.difficulty === 'Easy').count;
            const mediumSolved = acSubmissions.find(q => q.difficulty === 'Medium').count;
            const hardSolved = acSubmissions.find(q => q.difficulty === 'Hard').count;
            
            document.getElementById('totalSolved').textContent = totalSolved;
            document.getElementById('easySolved').textContent = easySolved;
            document.getElementById('mediumSolved').textContent = mediumSolved;
            document.getElementById('hardSolved').textContent = hardSolved;
            
            // Update progress bar
            const progressPercentage = ((totalSolved / totalProblems) * 100).toFixed(1);
            document.getElementById('overallProgress').style.width = `${progressPercentage}%`;
            document.getElementById('progressPercentage').textContent = `${progressPercentage}% of all problems solved`;
            
            // Now fetch recent AC submissions
            const recentSubmissionsQuery = {
                query: `
                    query getRecentAcSubmissions($username: String!, $limit: Int!) {
                        recentAcSubmissionList(username: $username, limit: $limit) {
                            title
                            titleSlug
                            timestamp
                        }
                    }
                `,
                variables: { username, limit: 10 }
            };

            const recentSubmissionsResponse = await fetch(CORS_PROXY + 'https://leetcode.com/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(recentSubmissionsQuery)
            });

            if (!recentSubmissionsResponse.ok) {
                throw new Error('Failed to fetch recent submissions');
            }

            const recentSubmissionsData = await recentSubmissionsResponse.json();
            
            if (recentSubmissionsData.errors) {
                throw new Error(recentSubmissionsData.errors[0].message);
            }
            
            // Update recent problems table
            updateRecentProblems(recentSubmissionsData.data.recentAcSubmissionList);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            showError(error.message || 'Failed to fetch data. Please check the username and try again.');
            
            // Fallback: try direct request (will likely fail due to CORS)
            tryDirectRequest(username);
        } finally {
            loadingIndicator.style.display = 'none';
            statsSection.style.opacity = '1';
            fetchButton.disabled = false;
        }
    }

    // Alternative approach: try direct request (will likely fail due to CORS)
    async function tryDirectRequest(username) {
        try {
            // This will likely fail due to CORS, but we try anyway
            const response = await fetch('https://leetcode.com/graphql', {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: `
                        query getUserProfile($username: String!) {
                            matchedUser(username: $username) {
                                username
                                submitStats {
                                    acSubmissionNum {
                                        difficulty
                                        count
                                    }
                                }
                            }
                        }
                    `,
                    variables: { username }
                })
            });
            
            // This won't work due to CORS, but we try
            console.log('Direct request attempted (will likely fail)');
        } catch (error) {
            console.error('Direct request also failed:', error);
        }
    }

    function updateRecentProblems(submissions) {
        const tableBody = document.getElementById('problemsTableBody');
        tableBody.innerHTML = '';
        
        if (!submissions || submissions.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" style="text-align: center;">No recent submissions found</td>';
            tableBody.appendChild(row);
            return;
        }
        
        // We need to get difficulty for each problem, which requires additional API calls
        // For now, we'll just show the titles and dates
        submissions.forEach(submission => {
            const row = document.createElement('tr');
            
            const titleCell = document.createElement('td');
            titleCell.textContent = submission.title;
            
            const difficultyCell = document.createElement('td');
            // We'll fetch difficulty for each problem individually
            const difficultySpan = document.createElement('span');
            difficultySpan.textContent = 'Loading...';
            difficultySpan.classList.add('difficulty');
            difficultyCell.appendChild(difficultySpan);
            
            // Fetch difficulty for this problem
            fetchProblemDifficulty(submission.titleSlug)
                .then(difficulty => {
                    difficultySpan.textContent = difficulty;
                    difficultySpan.classList.add(`difficulty-${difficulty.toLowerCase()}`);
                })
                .catch(() => {
                    difficultySpan.textContent = 'Unknown';
                });
            
            const dateCell = document.createElement('td');
            // Convert timestamp to readable date
            const date = new Date(parseInt(submission.timestamp) * 1000);
            dateCell.textContent = date.toLocaleDateString();
            
            row.appendChild(titleCell);
            row.appendChild(difficultyCell);
            row.appendChild(dateCell);
            
            tableBody.appendChild(row);
        });
    }
    
    // Function to fetch difficulty for a specific problem
    async function fetchProblemDifficulty(titleSlug) {
        const problemQuery = {
            query: `
                query getQuestionDetail($titleSlug: String!) {
                    question(titleSlug: $titleSlug) {
                        difficulty
                    }
                }
            `,
            variables: { titleSlug }
        };

        const response = await fetch(CORS_PROXY + 'https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(problemQuery)
        });

        if (!response.ok) {
            throw new Error('Failed to fetch problem difficulty');
        }

        const data = await response.json();
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        return data.data.question.difficulty;
    }
    
    // Initialize with empty input
    usernameInput.value = '';
});