-- ATS Database Schema

CREATE TABLE job (
    id              BIGSERIAL PRIMARY KEY,
    employer        VARCHAR(255) NOT NULL DEFAULT '',
    title           VARCHAR(255) NOT NULL,
    department      VARCHAR(255) NOT NULL,
    location        VARCHAR(255) NOT NULL,
    description     TEXT,
    required_skills TEXT,
    status          VARCHAR(50) NOT NULL,
    employment_type VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidate (
    id          BIGSERIAL PRIMARY KEY,
    first_name  VARCHAR(255) NOT NULL,
    last_name   VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    phone       VARCHAR(255),
    resume_url  VARCHAR(255),
    notes       TEXT,
    skills      TEXT,
    stage       VARCHAR(50) NOT NULL,
    stage_order INTEGER,
    job_id      BIGINT NOT NULL,
    applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_candidate_job FOREIGN KEY (job_id) REFERENCES job (id) ON DELETE CASCADE
);

CREATE INDEX idx_candidate_job_id ON candidate (job_id);
CREATE INDEX idx_candidate_stage ON candidate (stage);
CREATE INDEX idx_job_status ON job (status);

-- Seed data: sample jobs (with required_skills)
INSERT INTO job (employer, title, department, location, description, required_skills, status, employment_type) VALUES
('Acme Technologies', 'Senior Software Engineer', 'Engineering', 'San Francisco, CA (Remote)',
 'We are looking for a Senior Software Engineer to join our backend platform team. You will design and build scalable microservices, mentor junior engineers, and drive architecture decisions.',
 'Java,Spring Boot,Microservices,AWS,Docker,PostgreSQL,REST API,Kubernetes',
 'OPEN', 'FULL_TIME'),

('Pixel Creative', 'Product Designer', 'Design', 'New York, NY (Hybrid)',
 'Join our product design team to craft intuitive user experiences across our SaaS platform. You will work closely with product managers and engineers from ideation to launch.',
 'Figma,UI/UX,Prototyping,User Research,Design Systems,HTML/CSS,Wireframing',
 'OPEN', 'FULL_TIME'),

('Acme Technologies', 'DevOps Engineer', 'Engineering', 'Austin, TX (Remote)',
 'Seeking a DevOps Engineer to build and maintain our CI/CD pipelines, infrastructure-as-code, and observability stack on AWS.',
 'AWS,Docker,Kubernetes,CI/CD,Terraform,Linux,Ansible,Prometheus',
 'OPEN', 'FULL_TIME'),

('GrowthMedia', 'Marketing Intern', 'Marketing', 'Chicago, IL (On-site)',
 'Summer internship opportunity to support the marketing team with campaign analytics, content creation, and social media management.',
 'Social Media,Content Creation,Analytics,Google Ads,SEO,Copywriting',
 'OPEN', 'INTERNSHIP'),

('DataBridge Inc', 'Data Analyst', 'Data', 'Seattle, WA (Hybrid)',
 'Analyze large datasets to uncover insights that drive business decisions. Experience with SQL, Python, and BI tools required.',
 'SQL,Python,Tableau,Power BI,Statistics,Excel,Data Visualization',
 'DRAFT', 'FULL_TIME'),

('Acme Technologies', 'Frontend Developer', 'Engineering', 'Denver, CO (Remote)',
 'Build pixel-perfect, accessible user interfaces with Angular and TypeScript. Collaborate with designers and backend engineers.',
 'Angular,TypeScript,HTML/CSS,JavaScript,RxJS,SCSS,REST API',
 'CLOSED', 'CONTRACT');

-- Seed data: 100 candidates spread across jobs with relevant skill sets

-- Job 1: Senior Software Engineer (job_id = 1) — 22 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, stage, stage_order, job_id) VALUES
('Alice',   'Johnson',  'alice.johnson@example.com',  '555-0101', 'Java,Spring Boot,Microservices,AWS,Docker,PostgreSQL,REST API,Kubernetes', 'INTERVIEW',   0, 1),
('Bob',     'Smith',    'bob.smith@example.com',      '555-0102', 'Java,Spring Boot,Docker,PostgreSQL,REST API',                               'SCREENING',   0, 1),
('Carol',   'Williams', 'carol.williams@example.com', '555-0103', 'Java,Microservices,AWS,REST API',                                           'APPLIED',     0, 1),
('David',   'Brown',    'david.brown@example.com',    '555-0104', 'Java,Spring Boot,Kubernetes,AWS,Docker',                                    'ASSESSMENT',  0, 1),
('Eve',     'Davis',    'eve.davis@example.com',      '555-0105', 'Java,Spring Boot,Microservices,PostgreSQL,Docker,REST API,AWS',              'OFFER',       0, 1),
('Frank',   'Miller',   'frank.miller@example.com',   '555-0106', 'Java,Spring Boot,REST API,PostgreSQL',                                      'APPLIED',     1, 1),
('George',  'Wilson',   'george.wilson@example.com',  '555-0107', 'Java,AWS,Docker,Kubernetes,Linux',                                          'SCREENING',   0, 1),
('Hannah',  'Moore',    'hannah.moore@example.com',   '555-0108', 'Java,Spring Boot,Microservices,REST API,PostgreSQL,Kafka',                   'INTERVIEW',   0, 1),
('Ivan',    'Taylor',   'ivan.taylor@example.com',    '555-0109', 'Java,Docker,AWS,CI/CD,Linux',                                               'APPLIED',     0, 1),
('Julia',   'Anderson', 'julia.anderson@example.com', '555-0110', 'Java,Spring Boot,PostgreSQL,Redis,REST API',                                'SCREENING',   0, 1),
('Kevin',   'Thomas',   'kevin.thomas@example.com',   '555-0111', 'Python,Django,PostgreSQL,Docker,REST API',                                  'APPLIED',     0, 1),
('Laura',   'Jackson',  'laura.jackson@example.com',  '555-0112', 'Java,Spring Boot,Microservices,AWS,Docker,Kubernetes',                      'INTERVIEW',   1, 1),
('Marcus',  'White',    'marcus.white@example.com',   '555-0113', 'Java,REST API,PostgreSQL,Linux',                                            'APPLIED',     0, 1),
('Nina',    'Harris',   'nina.harris@example.com',    '555-0114', 'Java,Spring Boot,AWS,Docker,REST API,PostgreSQL',                           'SCREENING',   1, 1),
('Oscar',   'Martin',   'oscar.martin@example.com',   '555-0115', 'Golang,Docker,Kubernetes,AWS,Microservices',                                'APPLIED',     0, 1),
('Paula',   'Garcia',   'paula.garcia@example.com',   '555-0116', 'Java,Spring Boot,Microservices,Kafka,PostgreSQL,Docker',                     'ASSESSMENT',  0, 1),
('Quinn',   'Martinez', 'quinn.martinez@example.com', '555-0117', 'Java,Docker,AWS,REST API',                                                  'APPLIED',     0, 1),
('Rachel',  'Robinson', 'rachel.robinson@example.com','555-0118', 'Java,Spring Boot,Kubernetes,AWS,Docker,REST API,PostgreSQL',                 'INTERVIEW',   2, 1),
('Sam',     'Clark',    'sam.clark@example.com',      '555-0119', 'Scala,Spark,AWS,Docker',                                                    'APPLIED',     0, 1),
('Tara',    'Rodriguez','tara.rodriguez@example.com', '555-0120', 'Java,Spring Boot,REST API,PostgreSQL,Docker',                               'SCREENING',   2, 1),
('Umar',    'Lewis',    'umar.lewis@example.com',     '555-0121', 'Java,Microservices,Docker,Kubernetes,CI/CD',                                'APPLIED',     0, 1),
('Vera',    'Lee',      'vera.lee@example.com',        '555-0122', 'Java,Spring Boot,AWS,PostgreSQL,REST API,Kafka',                            'HIRED',       0, 1);

-- Job 2: Product Designer (job_id = 2) — 17 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, stage, stage_order, job_id) VALUES
('Grace',   'Lee',      'grace.lee@example.com',      '555-0201', 'Figma,UI/UX,Prototyping,User Research,Design Systems',                     'SCREENING',   0, 2),
('Hank',    'Wilson',   'hank.wilson@example.com',    '555-0202', 'Figma,UI/UX,Wireframing,HTML/CSS,Prototyping',                              'INTERVIEW',   0, 2),
('Iris',    'Taylor',   'iris.taylor@example.com',    '555-0203', 'Figma,Design Systems,User Research',                                        'APPLIED',     0, 2),
('James',   'Scott',    'james.scott@example.com',    '555-0204', 'Sketch,Figma,Prototyping,UI/UX,Wireframing',                                'APPLIED',     0, 2),
('Katie',   'Adams',    'katie.adams@example.com',    '555-0205', 'Figma,UI/UX,HTML/CSS,Design Systems,User Research',                         'INTERVIEW',   1, 2),
('Liam',    'Baker',    'liam.baker@example.com',     '555-0206', 'Figma,Wireframing,Prototyping',                                             'SCREENING',   1, 2),
('Mia',     'Hall',     'mia.hall@example.com',       '555-0207', 'Figma,UI/UX,User Research,Design Systems,HTML/CSS,Prototyping,Wireframing', 'ASSESSMENT',  0, 2),
('Noah',    'Young',    'noah.young@example.com',     '555-0208', 'Sketch,UI/UX,Wireframing,Prototyping',                                      'REJECTED',    0, 2),
('Olivia',  'Hernandez','olivia.hernandez@example.com','555-0209','Figma,UI/UX,Prototyping,Wireframing,HTML/CSS',                               'SCREENING',   2, 2),
('Peter',   'King',     'peter.king@example.com',     '555-0210', 'Figma,Design Systems,User Research,Wireframing',                            'APPLIED',     0, 2),
('Quinn',   'Wright',   'quinn.wright@example.com',   '555-0211', 'Figma,Prototyping,UI/UX',                                                   'APPLIED',     0, 2),
('Rita',    'Lopez',    'rita.lopez@example.com',     '555-0212', 'Figma,UI/UX,HTML/CSS,Wireframing,Design Systems,Prototyping',               'OFFER',       0, 2),
('Steve',   'Hill',     'steve.hill@example.com',     '555-0213', 'Figma,Wireframing,Sketch',                                                  'APPLIED',     0, 2),
('Tina',    'Scott',    'tina.scott@example.com',     '555-0214', 'Figma,UI/UX,User Research,HTML/CSS',                                        'INTERVIEW',   2, 2),
('Ulysses', 'Green',    'ulysses.green@example.com',  '555-0215', 'Figma,Design Systems,Prototyping,Wireframing,UI/UX',                         'SCREENING',   3, 2),
('Violet',  'Adams',    'violet.adams@example.com',   '555-0216', 'Figma,UI/UX,User Research,Prototyping',                                     'APPLIED',     0, 2),
('Walter',  'Nelson',   'walter.nelson@example.com',  '555-0217', 'Figma,UI/UX,Wireframing,HTML/CSS,Design Systems,User Research,Prototyping', 'HIRED',       0, 2);

-- Job 3: DevOps Engineer (job_id = 3) — 17 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, stage, stage_order, job_id) VALUES
('Jack',    'Anderson', 'jack.anderson@example.com',  '555-0301', 'AWS,Docker,Kubernetes,CI/CD,Terraform,Linux,Ansible,Prometheus',            'HIRED',       0, 3),
('Karen',   'Thomas',   'karen.thomas@example.com',   '555-0302', 'Docker,Kubernetes,CI/CD,Linux',                                             'REJECTED',    0, 3),
('Leo',     'Martinez', 'leo.martinez@example.com',   '555-0303', 'AWS,Docker,Linux,CI/CD',                                                    'SCREENING',   0, 3),
('Mandy',   'Thompson', 'mandy.thompson@example.com', '555-0304', 'AWS,Terraform,Ansible,Linux,CI/CD',                                         'INTERVIEW',   0, 3),
('Nate',    'Perez',    'nate.perez@example.com',     '555-0305', 'Docker,Kubernetes,Prometheus,Grafana,Linux',                                 'ASSESSMENT',  0, 3),
('Ophelia', 'Roberts',  'ophelia.roberts@example.com','555-0306', 'AWS,Docker,Kubernetes,CI/CD,Terraform,Ansible',                              'INTERVIEW',   1, 3),
('Patrick', 'Turner',   'patrick.turner@example.com', '555-0307', 'Linux,Shell Scripting,Docker,CI/CD',                                        'APPLIED',     0, 3),
('Queenie', 'Phillips', 'queenie.phillips@example.com','555-0308','AWS,Terraform,Kubernetes,Prometheus',                                        'SCREENING',   1, 3),
('Rick',    'Campbell', 'rick.campbell@example.com',  '555-0309', 'Docker,Linux,Ansible,CI/CD',                                                'APPLIED',     0, 3),
('Sara',    'Parker',   'sara.parker@example.com',    '555-0310', 'AWS,Docker,Kubernetes,Terraform,CI/CD,Linux,Prometheus',                    'OFFER',       0, 3),
('Tim',     'Evans',    'tim.evans@example.com',      '555-0311', 'CI/CD,Jenkins,Docker,Linux',                                                'APPLIED',     0, 3),
('Uma',     'Edwards',  'uma.edwards@example.com',    '555-0312', 'AWS,Docker,Kubernetes,Terraform,Ansible,Linux',                              'INTERVIEW',   2, 3),
('Victor',  'Collins',  'victor.collins@example.com', '555-0313', 'Docker,Kubernetes,Linux,CI/CD,Helm',                                        'SCREENING',   2, 3),
('Wendy',   'Stewart',  'wendy.stewart@example.com',  '555-0314', 'AWS,Terraform,CI/CD,Linux,Ansible',                                         'APPLIED',     0, 3),
('Xavier',  'Sanchez',  'xavier.sanchez@example.com', '555-0315', 'AWS,Docker,Linux,Kubernetes,Prometheus,Grafana',                             'SCREENING',   3, 3),
('Yvonne',  'Morris',   'yvonne.morris@example.com',  '555-0316', 'Docker,CI/CD,Linux,Terraform',                                              'APPLIED',     0, 3),
('Zach',    'Rogers',   'zach.rogers@example.com',    '555-0317', 'AWS,Kubernetes,Docker,Terraform,Ansible,CI/CD,Linux,Prometheus',             'ASSESSMENT',  1, 3);

-- Job 4: Marketing Intern (job_id = 4) — 15 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, stage, stage_order, job_id) VALUES
('Abby',    'Reed',     'abby.reed@example.com',      '555-0401', 'Social Media,Content Creation,Analytics,SEO',                               'APPLIED',     0, 4),
('Ben',     'Cook',     'ben.cook@example.com',       '555-0402', 'Google Ads,Analytics,SEO,Copywriting',                                      'SCREENING',   0, 4),
('Chloe',   'Morgan',   'chloe.morgan@example.com',   '555-0403', 'Social Media,Content Creation,Analytics,Google Ads,SEO,Copywriting',         'INTERVIEW',   0, 4),
('Dylan',   'Bell',     'dylan.bell@example.com',     '555-0404', 'Social Media,Copywriting,SEO',                                              'APPLIED',     0, 4),
('Ella',    'Murphy',   'ella.murphy@example.com',    '555-0405', 'Analytics,Google Ads,Content Creation',                                     'SCREENING',   1, 4),
('Finn',    'Bailey',   'finn.bailey@example.com',    '555-0406', 'Social Media,Content Creation,SEO,Google Ads,Analytics',                    'APPLIED',     0, 4),
('Gina',    'Rivera',   'gina.rivera@example.com',    '555-0407', 'Social Media,Copywriting,Analytics',                                        'APPLIED',     0, 4),
('Hugo',    'Cooper',   'hugo.cooper@example.com',    '555-0408', 'Google Ads,SEO,Analytics,Copywriting,Social Media',                         'INTERVIEW',   1, 4),
('Isla',    'Richardson','isla.richardson@example.com','555-0409','Content Creation,Social Media,SEO',                                          'APPLIED',     0, 4),
('Jesse',   'Cox',      'jesse.cox@example.com',      '555-0410', 'Analytics,Google Ads,SEO,Copywriting,Content Creation',                     'SCREENING',   2, 4),
('Kim',     'Howard',   'kim.howard@example.com',     '555-0411', 'Social Media,Content Creation,Analytics,Google Ads,SEO,Copywriting',         'OFFER',       0, 4),
('Luke',    'Ward',     'luke.ward@example.com',      '555-0412', 'SEO,Copywriting,Content Creation',                                          'APPLIED',     0, 4),
('Molly',   'Torres',   'molly.torres@example.com',   '555-0413', 'Social Media,Analytics,Copywriting,SEO',                                    'SCREENING',   3, 4),
('Nick',    'Peterson', 'nick.peterson@example.com',  '555-0414', 'Google Ads,Analytics,Social Media',                                         'APPLIED',     0, 4),
('Olivia',  'Gray',     'olivia.gray@example.com',    '555-0415', 'Social Media,Content Creation,Analytics,Google Ads,SEO,Copywriting',         'HIRED',       0, 4);

-- Job 5: Data Analyst (job_id = 5) — 14 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, stage, stage_order, job_id) VALUES
('Aaron',   'James',    'aaron.james@example.com',    '555-0501', 'SQL,Python,Tableau,Statistics,Excel',                                       'APPLIED',     0, 5),
('Beth',    'Watson',   'beth.watson@example.com',    '555-0502', 'SQL,Power BI,Excel,Data Visualization',                                     'SCREENING',   0, 5),
('Chris',   'Brooks',   'chris.brooks@example.com',   '555-0503', 'SQL,Python,Tableau,Power BI,Statistics,Data Visualization',                 'INTERVIEW',   0, 5),
('Diana',   'Kelly',    'diana.kelly@example.com',    '555-0504', 'SQL,Python,Statistics,Excel',                                               'APPLIED',     0, 5),
('Eric',    'Sanders',  'eric.sanders@example.com',   '555-0505', 'SQL,Tableau,Power BI,Data Visualization,Statistics',                        'SCREENING',   1, 5),
('Fiona',   'Price',    'fiona.price@example.com',    '555-0506', 'SQL,Python,Excel,Data Visualization',                                       'APPLIED',     0, 5),
('Gary',    'Bennett',  'gary.bennett@example.com',   '555-0507', 'SQL,Power BI,Tableau,Statistics,Python,Excel,Data Visualization',            'ASSESSMENT',  0, 5),
('Helen',   'Wood',     'helen.wood@example.com',     '555-0508', 'SQL,Python,Statistics',                                                     'APPLIED',     0, 5),
('Ian',     'Barnes',   'ian.barnes@example.com',     '555-0509', 'SQL,Tableau,Data Visualization,Excel,Statistics',                           'INTERVIEW',   1, 5),
('Janet',   'Ross',     'janet.ross@example.com',     '555-0510', 'SQL,Python,Power BI,Tableau,Statistics,Excel',                               'SCREENING',   2, 5),
('Karl',    'Henderson','karl.henderson@example.com', '555-0511', 'SQL,Excel,Statistics,Data Visualization',                                   'APPLIED',     0, 5),
('Lily',    'Coleman',  'lily.coleman@example.com',   '555-0512', 'SQL,Python,Tableau,Power BI,Statistics,Excel,Data Visualization',            'OFFER',       0, 5),
('Mike',    'Jenkins',  'mike.jenkins@example.com',   '555-0513', 'SQL,Power BI,Excel',                                                        'APPLIED',     0, 5),
('Nancy',   'Perry',    'nancy.perry@example.com',    '555-0514', 'SQL,Python,Tableau,Statistics,Data Visualization,Excel,Power BI',            'HIRED',       0, 5);

-- Job 6: Frontend Developer (job_id = 6) — 15 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, stage, stage_order, job_id) VALUES
('Adam',    'Powell',   'adam.powell@example.com',    '555-0601', 'Angular,TypeScript,HTML/CSS,JavaScript,REST API',                            'APPLIED',     0, 6),
('Brenda',  'Long',     'brenda.long@example.com',    '555-0602', 'Angular,TypeScript,RxJS,SCSS,HTML/CSS,JavaScript,REST API',                  'HIRED',       0, 6),
('Carlos',  'Patterson','carlos.patterson@example.com','555-0603','React,TypeScript,HTML/CSS,JavaScript,CSS',                                   'APPLIED',     0, 6),
('Donna',   'Hughes',   'donna.hughes@example.com',   '555-0604', 'Angular,TypeScript,HTML/CSS,JavaScript,SCSS',                               'SCREENING',   0, 6),
('Ethan',   'Flores',   'ethan.flores@example.com',   '555-0605', 'Angular,RxJS,TypeScript,HTML/CSS,SCSS,JavaScript',                          'INTERVIEW',   0, 6),
('Faith',   'Washington','faith.washington@example.com','555-0606','Angular,TypeScript,JavaScript,REST API,HTML/CSS',                           'APPLIED',     0, 6),
('Glen',    'Butler',   'glen.butler@example.com',    '555-0607', 'Vue.js,JavaScript,HTML/CSS,SCSS',                                           'APPLIED',     0, 6),
('Holly',   'Simmons',  'holly.simmons@example.com',  '555-0608', 'Angular,TypeScript,RxJS,SCSS,HTML/CSS,REST API,JavaScript',                  'ASSESSMENT',  0, 6),
('Ike',     'Foster',   'ike.foster@example.com',     '555-0609', 'Angular,TypeScript,HTML/CSS,JavaScript',                                    'APPLIED',     0, 6),
('Jade',    'Gonzales', 'jade.gonzales@example.com',  '555-0610', 'Angular,TypeScript,SCSS,RxJS,HTML/CSS,JavaScript,REST API',                  'OFFER',       0, 6),
('Kyle',    'Bryant',   'kyle.bryant@example.com',    '555-0611', 'TypeScript,JavaScript,HTML/CSS,Angular',                                    'APPLIED',     0, 6),
('Luna',    'Alexander','luna.alexander@example.com', '555-0612', 'Angular,TypeScript,RxJS,HTML/CSS,SCSS,REST API',                             'INTERVIEW',   1, 6),
('Max',     'Russell',  'max.russell@example.com',    '555-0613', 'React,JavaScript,HTML/CSS,TypeScript',                                      'APPLIED',     0, 6),
('Nora',    'Griffin',  'nora.griffin@example.com',   '555-0614', 'Angular,TypeScript,HTML/CSS,JavaScript,SCSS,RxJS',                          'SCREENING',   1, 6),
('Omar',    'Diaz',     'omar.diaz@example.com',      '555-0615', 'Angular,TypeScript,RxJS,SCSS,HTML/CSS,JavaScript,REST API',                  'REJECTED',    0, 6);
