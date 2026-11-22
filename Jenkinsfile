// CI pipeline for DevOps Launchpad (React frontend + Express backend).
// CI only: no deployment steps. CD will be added later.

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    environment {
        // Hide npm funding messages; security audit output stays enabled.
        npm_config_fund = 'false'
        CI = 'true'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Node & npm') {
            steps {
                sh '''
                    node --version
                    npm --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                // Root script: npm install --prefix backend && npm install --prefix frontend
                sh 'npm run install:all'
            }
        }

        stage('Build Frontend') {
            steps {
                // Root script: npm run build --prefix frontend  (vite build -> frontend/dist)
                sh 'npm run build'
            }
        }

        stage('Run Tests') {
            steps {
                // No test scripts exist yet; --if-present runs them once they are added
                // and skips quietly until then.
                sh '''
                    npm test --if-present --prefix backend
                    npm test --if-present --prefix frontend
                '''
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: 'frontend/dist/**', fingerprint: true, onlyIfSuccessful: true
            }
        }

        stage('Test Application EC2 SSH') {
            steps {
                // Connectivity check only: no deployment commands.
                sshagent(credentials: ['app-ec2-ssh']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 ubuntu@172.31.44.226 \
                            "echo SSH connection successful && hostname && whoami"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'CI pipeline succeeded. Frontend build archived.'
        }
        failure {
            echo 'CI pipeline failed. Check the stage logs above.'
        }
        always {
            deleteDir()
        }
    }
}
