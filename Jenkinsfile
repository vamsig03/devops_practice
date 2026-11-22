// CI/CD pipeline for DevOps Launchpad (React frontend + Express backend).
// CI stages build and test; the final stage deploys to the Application EC2 over SSH.

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

        // Deployment target (Application EC2). No secrets here: the SSH key comes from 'app-ec2-ssh'.
        APP_HOST = 'ubuntu@172.31.44.226'
        APP_DIR  = '/srv/launchpad/devops_practice'
        PM2_APP  = 'launchpad-api'
        SSH_OPTS = '-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes'
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

        stage('Deploy to Application EC2') {
            steps {
                // Runs only if every CI stage above succeeded.
                sshagent(credentials: ['app-ec2-ssh']) {
                    // 1. SSH test + check tools, folders, ownership and backend/.env. Copies nothing.
                    sh label: 'Pre-flight checks', script: '''
                        command -v rsync >/dev/null || { echo "ERROR: rsync is not installed on the Jenkins agent"; exit 1; }
                        ssh $SSH_OPTS "$APP_HOST" 'bash -s' -- preflight "$APP_DIR" "$PM2_APP" < deploy/remote-deploy.sh
                    '''

                    // 2. Copy backend source. No --delete, and .env*/node_modules are excluded, so they are never sent or removed.
                    sh label: 'Sync backend source', script: '''
                        rsync -az --chmod=D755,F644 -e "ssh $SSH_OPTS" \
                            --exclude='.env' --exclude='.env.*' --exclude='node_modules/' --exclude='*.log' \
                            backend/ "$APP_HOST:$APP_DIR/backend/"
                    '''

                    // 3. npm ci --omit=dev, pm2 startOrReload --update-env, pm2 save, health check (PORT from .env, fallback 5000).
                    sh label: 'Install, reload PM2, health check', script: '''
                        ssh $SSH_OPTS "$APP_HOST" 'bash -s' -- release "$APP_DIR" "$PM2_APP" < deploy/remote-deploy.sh
                    '''

                    // 4. Publish the frontend built by CI. --delete-after only affects frontend/dist.
                    sh label: 'Sync frontend build', script: '''
                        test -f frontend/dist/index.html
                        rsync -az --delete-after --chmod=D755,F644 -e "ssh $SSH_OPTS" \
                            frontend/dist/ "$APP_HOST:$APP_DIR/frontend/dist/"
                        ssh $SSH_OPTS "$APP_HOST" "test -f '$APP_DIR/frontend/dist/index.html' && echo 'Frontend deployed.'"
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
