-- ATS Database Schema

CREATE TABLE job (
    id              BIGSERIAL PRIMARY KEY,
    employer        VARCHAR(255) NOT NULL DEFAULT '',
    title           VARCHAR(255) NOT NULL,
    department      VARCHAR(255) NOT NULL,
    location        VARCHAR(255) NOT NULL,
    description     TEXT,
    required_skills TEXT,
    address         VARCHAR(500),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    status          VARCHAR(50) NOT NULL,
    employment_type VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidate (
    id                   BIGSERIAL PRIMARY KEY,
    first_name           VARCHAR(255) NOT NULL,
    last_name            VARCHAR(255) NOT NULL,
    email                VARCHAR(255) NOT NULL,
    phone                VARCHAR(255),
    resume_url           VARCHAR(255),
    notes                TEXT,
    skills               TEXT,
    address              VARCHAR(500),
    latitude             DOUBLE PRECISION,
    longitude            DOUBLE PRECISION,
    last_assignment_days INTEGER DEFAULT 0,
    stage                VARCHAR(50) NOT NULL,
    stage_order          INTEGER,
    job_id               BIGINT NOT NULL,
    applied_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_candidate_job FOREIGN KEY (job_id) REFERENCES job (id) ON DELETE CASCADE
);

CREATE INDEX idx_candidate_job_id ON candidate (job_id);
CREATE INDEX idx_candidate_stage ON candidate (stage);
CREATE INDEX idx_job_status ON job (status);

-- Seed data: sample jobs (with required_skills, address, lat/lng)
INSERT INTO job (employer, title, department, location, description, required_skills, address, latitude, longitude, status, employment_type) VALUES
('Acme Technologies', 'Senior Software Engineer', 'Engineering', 'San Francisco, CA (Remote)',
 'We are looking for a Senior Software Engineer to join our backend platform team. You will design and build scalable microservices, mentor junior engineers, and drive architecture decisions.',
 'Java,Spring Boot,Microservices,AWS,Docker,PostgreSQL,REST API,Kubernetes',
 '100 Pine St, San Francisco, CA 94111', 37.7920, -122.4000,
 'OPEN', 'FULL_TIME'),

('Pixel Creative', 'Product Designer', 'Design', 'New York, NY (Hybrid)',
 'Join our product design team to craft intuitive user experiences across our SaaS platform. You will work closely with product managers and engineers from ideation to launch.',
 'Figma,UI/UX,Prototyping,User Research,Design Systems,HTML/CSS,Wireframing',
 '350 5th Ave, New York, NY 10118', 40.7484, -73.9967,
 'OPEN', 'FULL_TIME'),

('Acme Technologies', 'DevOps Engineer', 'Engineering', 'Austin, TX (Remote)',
 'Seeking a DevOps Engineer to build and maintain our CI/CD pipelines, infrastructure-as-code, and observability stack on AWS.',
 'AWS,Docker,Kubernetes,CI/CD,Terraform,Linux,Ansible,Prometheus',
 '100 Congress Ave, Austin, TX 78701', 30.2672, -97.7431,
 'OPEN', 'FULL_TIME'),

('GrowthMedia', 'Marketing Intern', 'Marketing', 'Chicago, IL (On-site)',
 'Summer internship opportunity to support the marketing team with campaign analytics, content creation, and social media management.',
 'Social Media,Content Creation,Analytics,Google Ads,SEO,Copywriting',
 '233 S Wacker Dr, Chicago, IL 60606', 41.8790, -87.6359,
 'OPEN', 'INTERNSHIP'),

('DataBridge Inc', 'Data Analyst', 'Data', 'Seattle, WA (Hybrid)',
 'Analyze large datasets to uncover insights that drive business decisions. Experience with SQL, Python, and BI tools required.',
 'SQL,Python,Tableau,Power BI,Statistics,Excel,Data Visualization',
 '400 Broad St, Seattle, WA 98109', 47.6205, -122.3493,
 'DRAFT', 'FULL_TIME'),

('Acme Technologies', 'Frontend Developer', 'Engineering', 'Denver, CO (Remote)',
 'Build pixel-perfect, accessible user interfaces with Angular and TypeScript. Collaborate with designers and backend engineers.',
 'Angular,TypeScript,HTML/CSS,JavaScript,RxJS,SCSS,REST API',
 '1700 Lincoln St, Denver, CO 80203', 39.7476, -104.9876,
 'CLOSED', 'CONTRACT');

-- Seed data: 100 candidates with address, lat/lng, last_assignment_days

-- Job 1: Senior Software Engineer @ Acme Technologies, San Francisco (job_id = 1) — 22 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, address, latitude, longitude, last_assignment_days, stage, stage_order, job_id) VALUES
('Alice',   'Johnson',  'alice.johnson@example.com',  '555-0101', 'Java,Spring Boot,Microservices,AWS,Docker,PostgreSQL,REST API,Kubernetes', '384 Grand Ave, Oakland, CA 94610',              37.8044, -122.2712, 548, 'INTERVIEW',  0, 1),
('Bob',     'Smith',    'bob.smith@example.com',      '555-0102', 'Java,Spring Boot,Docker,PostgreSQL,REST API',                               '2100 Blossom Hill Rd, San Jose, CA 95124',      37.2502, -121.8778, 120, 'SCREENING',  0, 1),
('Carol',   'Williams', 'carol.williams@example.com', '555-0103', 'Java,Microservices,AWS,REST API',                                           '2520 Durant Ave, Berkeley, CA 94704',           37.8681, -122.2660, 365, 'APPLIED',    0, 1),
('David',   'Brown',    'david.brown@example.com',    '555-0104', 'Java,Spring Boot,Kubernetes,AWS,Docker',                                    '1 Baldwin Ave, San Mateo, CA 94401',            37.5630, -122.3255, 180, 'ASSESSMENT', 0, 1),
('Eve',     'Davis',    'eve.davis@example.com',      '555-0105', 'Java,Spring Boot,Microservices,PostgreSQL,Docker,REST API,AWS',              '24 Sanchez St, San Francisco, CA 94114',        37.7599, -122.4148, 730, 'OFFER',      0, 1),
('Frank',   'Miller',   'frank.miller@example.com',   '555-0106', 'Java,Spring Boot,REST API,PostgreSQL',                                      '260 Alma St, Palo Alto, CA 94301',              37.4419, -122.1430, 90,  'APPLIED',    1, 1),
('George',  'Wilson',   'george.wilson@example.com',  '555-0107', 'Java,AWS,Docker,Kubernetes,Linux',                                          '301 6th Ave, San Francisco, CA 94118',          37.7785, -122.4647, 270, 'SCREENING',  0, 1),
('Hannah',  'Moore',    'hannah.moore@example.com',   '555-0108', 'Java,Spring Boot,Microservices,REST API,PostgreSQL,Kafka',                   '201 Grand Ave, South San Francisco, CA 94080',  37.6547, -122.4077, 455, 'INTERVIEW',  0, 1),
('Ivan',    'Taylor',   'ivan.taylor@example.com',    '555-0109', 'Java,Docker,AWS,CI/CD,Linux',                                               '39120 State St, Fremont, CA 94538',             37.5485, -121.9886, 60,  'APPLIED',    0, 1),
('Julia',   'Anderson', 'julia.anderson@example.com', '555-0110', 'Java,Spring Boot,PostgreSQL,Redis,REST API',                                '300 Hillside Blvd, Daly City, CA 94014',        37.6879, -122.4702, 300, 'SCREENING',  0, 1),
('Kevin',   'Thomas',   'kevin.thomas@example.com',   '555-0111', 'Python,Django,PostgreSQL,Docker,REST API',                                  '1201 California St, San Francisco, CA 94109',   37.7930, -122.4161, 45,  'APPLIED',    0, 1),
('Laura',   'Jackson',  'laura.jackson@example.com',  '555-0112', 'Java,Spring Boot,Microservices,AWS,Docker,Kubernetes',                      '303 Twin Dolphin Dr, Redwood City, CA 94065',   37.4852, -122.2364, 500, 'INTERVIEW',  1, 1),
('Marcus',  'White',    'marcus.white@example.com',   '555-0113', 'Java,REST API,PostgreSQL,Linux',                                            '4100 17th St, San Francisco, CA 94114',         37.7609, -122.4350, 150, 'APPLIED',    0, 1),
('Nina',    'Harris',   'nina.harris@example.com',    '555-0114', 'Java,Spring Boot,AWS,Docker,REST API,PostgreSQL',                           '384 Grand Ave, Oakland, CA 94610',              37.8044, -122.2712, 365, 'SCREENING',  1, 1),
('Oscar',   'Martin',   'oscar.martin@example.com',   '555-0115', 'Golang,Docker,Kubernetes,AWS,Microservices',                                '1010 S Mary Ave, Sunnyvale, CA 94087',          37.3688, -122.0363, 30,  'APPLIED',    0, 1),
('Paula',   'Garcia',   'paula.garcia@example.com',   '555-0116', 'Java,Spring Boot,Microservices,Kafka,PostgreSQL,Docker',                     '2350 Mission Blvd, Hayward, CA 94541',          37.6688, -122.0808, 600, 'ASSESSMENT', 0, 1),
('Quinn',   'Martinez', 'quinn.martinez@example.com', '555-0117', 'Java,Docker,AWS,REST API',                                                  '100 Turk St, San Francisco, CA 94102',          37.7835, -122.4133, 75,  'APPLIED',    0, 1),
('Rachel',  'Robinson', 'rachel.robinson@example.com','555-0118', 'Java,Spring Boot,Kubernetes,AWS,Docker,REST API,PostgreSQL',                 '1580 N Main St, Walnut Creek, CA 94596',        37.9101, -122.0652, 420, 'INTERVIEW',  2, 1),
('Sam',     'Clark',    'sam.clark@example.com',      '555-0119', 'Scala,Spark,AWS,Docker',                                                    '45 Freelon St, San Francisco, CA 94107',        37.7785, -122.3948, 200, 'APPLIED',    0, 1),
('Tara',    'Rodriguez','tara.rodriguez@example.com', '555-0120', 'Java,Spring Boot,REST API,PostgreSQL,Docker',                               '1401 Marina Dr, Alameda, CA 94501',             37.7652, -122.2416, 240, 'SCREENING',  2, 1),
('Umar',    'Lewis',    'umar.lewis@example.com',     '555-0121', 'Java,Microservices,Docker,Kubernetes,CI/CD',                                '1001 N Shoreline Blvd, Mountain View, CA 94043',37.3861, -122.0839, 330, 'APPLIED',    0, 1),
('Vera',    'Lee',      'vera.lee@example.com',        '555-0122', 'Java,Spring Boot,AWS,PostgreSQL,REST API,Kafka',                            '3910 24th St, San Francisco, CA 94114',         37.7502, -122.4329, 730, 'HIRED',      0, 1);

-- Job 2: Product Designer @ Pixel Creative, New York (job_id = 2) — 17 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, address, latitude, longitude, last_assignment_days, stage, stage_order, job_id) VALUES
('Grace',   'Lee',      'grace.lee@example.com',      '555-0201', 'Figma,UI/UX,Prototyping,User Research,Design Systems',                     '450 Atlantic Ave, Brooklyn, NY 11217',           40.6862, -73.9836, 180, 'SCREENING',  0, 2),
('Hank',    'Wilson',   'hank.wilson@example.com',    '555-0202', 'Figma,UI/UX,Wireframing,HTML/CSS,Prototyping',                              '88 Hudson St, Hoboken, NJ 07030',                40.7440, -74.0324, 365, 'INTERVIEW',  0, 2),
('Iris',    'Taylor',   'iris.taylor@example.com',    '555-0203', 'Figma,Design Systems,User Research',                                        '34-20 Junction Blvd, Queens, NY 11372',          40.7282, -73.8813, 90,  'APPLIED',    0, 2),
('James',   'Scott',    'james.scott@example.com',    '555-0204', 'Sketch,Figma,Prototyping,UI/UX,Wireframing',                                '160 Bay St, Jersey City, NJ 07302',              40.7178, -74.0431, 270, 'APPLIED',    0, 2),
('Katie',   'Adams',    'katie.adams@example.com',    '555-0205', 'Figma,UI/UX,HTML/CSS,Design Systems,User Research',                         '250 W 94th St, New York, NY 10025',              40.7870, -73.9754, 540, 'INTERVIEW',  1, 2),
('Liam',    'Baker',    'liam.baker@example.com',     '555-0206', 'Figma,Wireframing,Prototyping',                                             '550 Grand Concourse, Bronx, NY 10451',           40.8448, -73.9264, 60,  'SCREENING',  1, 2),
('Mia',     'Hall',     'mia.hall@example.com',       '555-0207', 'Figma,UI/UX,User Research,Design Systems,HTML/CSS,Prototyping,Wireframing', '100 Atlantic Ave, Brooklyn, NY 11201',           40.6897, -73.9988, 730, 'ASSESSMENT', 0, 2),
('Noah',    'Young',    'noah.young@example.com',     '555-0208', 'Sketch,UI/UX,Wireframing,Prototyping',                                      '50 Bay St, Staten Island, NY 10301',             40.6424, -74.0751, 30,  'REJECTED',   0, 2),
('Olivia',  'Hernandez','olivia.hernandez@example.com','555-0209','Figma,UI/UX,Prototyping,Wireframing,HTML/CSS',                               '28-55 Steinway St, Astoria, NY 11103',           40.7721, -73.9302, 120, 'SCREENING',  2, 2),
('Peter',   'King',     'peter.king@example.com',     '555-0210', 'Figma,Design Systems,User Research,Wireframing',                            '100 Palisade Ave, Yonkers, NY 10701',            40.9312, -73.8988, 200, 'APPLIED',    0, 2),
('Quinn',   'Wright',   'quinn.wright@example.com',   '555-0211', 'Figma,Prototyping,UI/UX',                                                   '12 E 2nd St, New York, NY 10003',                40.7265, -73.9815, 45,  'APPLIED',    0, 2),
('Rita',    'Lopez',    'rita.lopez@example.com',     '555-0212', 'Figma,UI/UX,HTML/CSS,Wireframing,Design Systems,Prototyping',               '123 W 22nd St, New York, NY 10011',              40.7465, -74.0014, 480, 'OFFER',      0, 2),
('Steve',   'Hill',     'steve.hill@example.com',     '555-0213', 'Figma,Wireframing,Sketch',                                                  '221 Ferry St, Newark, NJ 07105',                 40.7357, -74.1724, 75,  'APPLIED',    0, 2),
('Tina',    'Scott',    'tina.scott@example.com',     '555-0214', 'Figma,UI/UX,User Research,HTML/CSS',                                        '136-40 41st Ave, Flushing, NY 11355',            40.7675, -73.8330, 300, 'INTERVIEW',  2, 2),
('Ulysses', 'Green',    'ulysses.green@example.com',  '555-0215', 'Figma,Design Systems,Prototyping,Wireframing,UI/UX',                         '180 E 79th St, New York, NY 10075',              40.7735, -73.9565, 150, 'SCREENING',  3, 2),
('Violet',  'Adams',    'violet.adams@example.com',   '555-0216', 'Figma,UI/UX,User Research,Prototyping',                                     '44-02 Vernon Blvd, Long Island City, NY 11101',  40.7448, -73.9481, 210, 'APPLIED',    0, 2),
('Walter',  'Nelson',   'walter.nelson@example.com',  '555-0217', 'Figma,UI/UX,Wireframing,HTML/CSS,Design Systems,User Research,Prototyping', '80 Maiden Ln, New York, NY 10038',               40.7075, -74.0113, 600, 'HIRED',      0, 2);

-- Job 3: DevOps Engineer @ Acme Technologies, Austin (job_id = 3) — 17 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, address, latitude, longitude, last_assignment_days, stage, stage_order, job_id) VALUES
('Jack',    'Anderson', 'jack.anderson@example.com',  '555-0301', 'AWS,Docker,Kubernetes,CI/CD,Terraform,Linux,Ansible,Prometheus',            '600 Congress Ave, Austin, TX 78701',             30.2672, -97.7431, 730, 'HIRED',      0, 3),
('Karen',   'Thomas',   'karen.thomas@example.com',   '555-0302', 'Docker,Kubernetes,CI/CD,Linux',                                             '1500 Round Rock Ave, Round Rock, TX 78681',      30.5083, -97.6789, 180, 'REJECTED',   0, 3),
('Leo',     'Martinez', 'leo.martinez@example.com',   '555-0303', 'AWS,Docker,Linux,CI/CD',                                                    '700 E Whitestone Blvd, Cedar Park, TX 78613',    30.5052, -97.8203, 120, 'SCREENING',  0, 3),
('Mandy',   'Thompson', 'mandy.thompson@example.com', '555-0304', 'AWS,Terraform,Ansible,Linux,CI/CD',                                         '4500 S Lamar Blvd, Austin, TX 78745',            30.2241, -97.7811, 450, 'INTERVIEW',  0, 3),
('Nate',    'Perez',    'nate.perez@example.com',     '555-0305', 'Docker,Kubernetes,Prometheus,Grafana,Linux',                                 '101 W University Ave, Georgetown, TX 78626',     30.6333, -97.6772, 300, 'ASSESSMENT', 0, 3),
('Ophelia', 'Roberts',  'ophelia.roberts@example.com','555-0306', 'AWS,Docker,Kubernetes,CI/CD,Terraform,Ansible',                              '2100 E 7th St, Austin, TX 78702',                30.2629, -97.7151, 540, 'INTERVIEW',  1, 3),
('Patrick', 'Turner',   'patrick.turner@example.com', '555-0307', 'Linux,Shell Scripting,Docker,CI/CD',                                        '1700 Lehman Rd, Kyle, TX 78640',                 29.9899, -97.8772, 60,  'APPLIED',    0, 3),
('Queenie', 'Phillips', 'queenie.phillips@example.com','555-0308','AWS,Terraform,Kubernetes,Prometheus',                                        '1300 E Anderson Ln, Austin, TX 78752',           30.3498, -97.7341, 270, 'SCREENING',  1, 3),
('Rick',    'Campbell', 'rick.campbell@example.com',  '555-0309', 'Docker,Linux,Ansible,CI/CD',                                                '15700 FM 1825, Pflugerville, TX 78660',           30.4393, -97.6200, 90,  'APPLIED',    0, 3),
('Sara',    'Parker',   'sara.parker@example.com',    '555-0310', 'AWS,Docker,Kubernetes,Terraform,CI/CD,Linux,Prometheus',                    '3300 Bee Cave Rd, Austin, TX 78746',             30.2849, -97.7966, 420, 'OFFER',      0, 3),
('Tim',     'Evans',    'tim.evans@example.com',      '555-0311', 'CI/CD,Jenkins,Docker,Linux',                                                '615 Wonder World Dr, Buda, TX 78610',            30.0852, -97.8397, 150, 'APPLIED',    0, 3),
('Uma',     'Edwards',  'uma.edwards@example.com',    '555-0312', 'AWS,Docker,Kubernetes,Terraform,Ansible,Linux',                              '501 Crystal Falls Pkwy, Leander, TX 78641',      30.5788, -97.8531, 360, 'INTERVIEW',  2, 3),
('Victor',  'Collins',  'victor.collins@example.com', '555-0313', 'Docker,Kubernetes,Linux,CI/CD,Helm',                                        '1800 E Riverside Dr, Austin, TX 78741',          30.2354, -97.7259, 200, 'SCREENING',  2, 3),
('Wendy',   'Stewart',  'wendy.stewart@example.com',  '555-0314', 'AWS,Terraform,CI/CD,Linux,Ansible',                                         '701 N Main St, Elgin, TX 78621',                 30.3493, -97.3700, 240, 'APPLIED',    0, 3),
('Xavier',  'Sanchez',  'xavier.sanchez@example.com', '555-0315', 'AWS,Docker,Linux,Kubernetes,Prometheus,Grafana',                             '10000 Research Blvd, Austin, TX 78759',          30.4016, -97.7370, 500, 'SCREENING',  3, 3),
('Yvonne',  'Morris',   'yvonne.morris@example.com',  '555-0316', 'Docker,CI/CD,Linux,Terraform',                                              '200 N LBJ Dr, San Marcos, TX 78666',             29.8827, -97.9414, 75,  'APPLIED',    0, 3),
('Zach',    'Rogers',   'zach.rogers@example.com',    '555-0317', 'AWS,Kubernetes,Docker,Terraform,Ansible,CI/CD,Linux,Prometheus',             '3800 S Lamar Blvd, Austin, TX 78704',            30.2355, -97.8231, 600, 'ASSESSMENT', 1, 3);

-- Job 4: Marketing Intern @ GrowthMedia, Chicago (job_id = 4) — 15 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, address, latitude, longitude, last_assignment_days, stage, stage_order, job_id) VALUES
('Abby',    'Reed',     'abby.reed@example.com',      '555-0401', 'Social Media,Content Creation,Analytics,SEO',                               '1733 N Milwaukee Ave, Chicago, IL 60647',        41.9088, -87.6748, 180, 'APPLIED',    0, 4),
('Ben',     'Cook',     'ben.cook@example.com',       '555-0402', 'Google Ads,Analytics,SEO,Copywriting',                                      '1715 Chicago Ave, Evanston, IL 60201',           42.0451, -87.6877, 270, 'SCREENING',  0, 4),
('Chloe',   'Morgan',   'chloe.morgan@example.com',   '555-0403', 'Social Media,Content Creation,Analytics,Google Ads,SEO,Copywriting',         '2140 N Halsted St, Chicago, IL 60614',           41.9214, -87.6513, 365, 'INTERVIEW',  0, 4),
('Dylan',   'Bell',     'dylan.bell@example.com',     '555-0404', 'Social Media,Copywriting,SEO',                                              '5701 S Woodlawn Ave, Chicago, IL 60637',         41.7943, -87.5907, 60,  'APPLIED',    0, 4),
('Ella',    'Murphy',   'ella.murphy@example.com',    '555-0405', 'Analytics,Google Ads,Content Creation',                                     '820 Lake St, Oak Park, IL 60301',                41.8850, -87.7845, 120, 'SCREENING',  1, 4),
('Finn',    'Bailey',   'finn.bailey@example.com',    '555-0406', 'Social Media,Content Creation,SEO,Google Ads,Analytics',                    '55 S Main St, Naperville, IL 60540',             41.7508, -88.1535, 45,  'APPLIED',    0, 4),
('Gina',    'Rivera',   'gina.rivera@example.com',    '555-0407', 'Social Media,Copywriting,Analytics',                                        '1800 S Blue Island Ave, Chicago, IL 60608',      41.8565, -87.6600, 300, 'APPLIED',    0, 4),
('Hugo',    'Cooper',   'hugo.cooper@example.com',    '555-0408', 'Google Ads,SEO,Analytics,Copywriting,Social Media',                         '321 N Clark St, Chicago, IL 60654',              41.8916, -87.6341, 420, 'INTERVIEW',  1, 4),
('Isla',    'Richardson','isla.richardson@example.com','555-0409','Content Creation,Social Media,SEO',                                          '1100 E Golf Rd, Schaumburg, IL 60173',           42.0334, -88.0834, 90,  'APPLIED',    0, 4),
('Jesse',   'Cox',      'jesse.cox@example.com',      '555-0410', 'Analytics,Google Ads,SEO,Copywriting,Content Creation',                     '2756 N Milwaukee Ave, Chicago, IL 60647',        41.9210, -87.7086, 480, 'SCREENING',  2, 4),
('Kim',     'Howard',   'kim.howard@example.com',     '555-0411', 'Social Media,Content Creation,Analytics,Google Ads,SEO,Copywriting',         '7714 Lake St, River Forest, IL 60305',           41.8978, -87.8138, 545, 'OFFER',      0, 4),
('Luke',    'Ward',     'luke.ward@example.com',      '555-0412', 'SEO,Copywriting,Content Creation',                                          '600 E Washington St, Joliet, IL 60433',          41.5250, -88.0817, 75,  'APPLIED',    0, 4),
('Molly',   'Torres',   'molly.torres@example.com',   '555-0413', 'Social Media,Analytics,Copywriting,SEO',                                    '3512 N Clark St, Chicago, IL 60657',             41.9468, -87.6553, 210, 'SCREENING',  3, 4),
('Nick',    'Peterson', 'nick.peterson@example.com',  '555-0414', 'Google Ads,Analytics,Social Media',                                         '6600 W Cermak Rd, Berwyn, IL 60402',             41.8500, -87.7937, 150, 'APPLIED',    0, 4),
('Olivia',  'Gray',     'olivia.gray@example.com',    '555-0415', 'Social Media,Content Creation,Analytics,Google Ads,SEO,Copywriting',         '520 S Michigan Ave, Chicago, IL 60605',          41.8751, -87.6244, 730, 'HIRED',      0, 4);

-- Job 5: Data Analyst @ DataBridge Inc, Seattle (job_id = 5) — 14 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, address, latitude, longitude, last_assignment_days, stage, stage_order, job_id) VALUES
('Aaron',   'James',    'aaron.james@example.com',    '555-0501', 'SQL,Python,Tableau,Statistics,Excel',                                       '1600 Broadway E, Seattle, WA 98102',             47.6253, -122.3222, 90,  'APPLIED',    0, 5),
('Beth',    'Watson',   'beth.watson@example.com',    '555-0502', 'SQL,Power BI,Excel,Data Visualization',                                     '100 112th Ave NE, Bellevue, WA 98004',           47.6101, -122.2015, 240, 'SCREENING',  0, 5),
('Chris',   'Brooks',   'chris.brooks@example.com',   '555-0503', 'SQL,Python,Tableau,Power BI,Statistics,Data Visualization',                 '15600 NE 8th St, Redmond, WA 98052',             47.6740, -122.1215, 480, 'INTERVIEW',  0, 5),
('Diana',   'Kelly',    'diana.kelly@example.com',    '555-0504', 'SQL,Python,Statistics,Excel',                                               '1 Queen Anne Ave N, Seattle, WA 98109',          47.6365, -122.3568, 120, 'APPLIED',    0, 5),
('Eric',    'Sanders',  'eric.sanders@example.com',   '555-0505', 'SQL,Tableau,Power BI,Data Visualization,Statistics',                        '415 Lake St S, Kirkland, WA 98033',              47.6769, -122.2060, 300, 'SCREENING',  1, 5),
('Fiona',   'Price',    'fiona.price@example.com',    '555-0506', 'SQL,Python,Excel,Data Visualization',                                       '5200 24th Ave NW, Seattle, WA 98107',            47.6677, -122.3831, 60,  'APPLIED',    0, 5),
('Gary',    'Bennett',  'gary.bennett@example.com',   '555-0507', 'SQL,Power BI,Tableau,Statistics,Python,Excel,Data Visualization',            '100 S 2nd St, Renton, WA 98057',                 47.4799, -122.2171, 545, 'ASSESSMENT', 0, 5),
('Helen',   'Wood',     'helen.wood@example.com',     '555-0508', 'SQL,Python,Statistics',                                                     '3701 Phinney Ave N, Seattle, WA 98103',          47.6503, -122.3499, 45,  'APPLIED',    0, 5),
('Ian',     'Barnes',   'ian.barnes@example.com',     '555-0509', 'SQL,Tableau,Data Visualization,Excel,Statistics',                           '1001 Pacific Ave, Tacoma, WA 98402',             47.2529, -122.4443, 200, 'INTERVIEW',  1, 5),
('Janet',   'Ross',     'janet.ross@example.com',     '555-0510', 'SQL,Python,Power BI,Tableau,Statistics,Excel',                               '801 228th Ave NE, Sammamish, WA 98074',          47.6163, -122.0356, 365, 'SCREENING',  2, 5),
('Karl',    'Henderson','karl.henderson@example.com', '555-0511', 'SQL,Excel,Statistics,Data Visualization',                                   '2040 76th Ave SE, Mercer Island, WA 98040',      47.5707, -122.2210, 150, 'APPLIED',    0, 5),
('Lily',    'Coleman',  'lily.coleman@example.com',   '555-0512', 'SQL,Python,Tableau,Power BI,Statistics,Excel,Data Visualization',            '720 N 185th St, Shoreline, WA 98133',            47.7532, -122.3415, 600, 'OFFER',      0, 5),
('Mike',    'Jenkins',  'mike.jenkins@example.com',   '555-0513', 'SQL,Power BI,Excel',                                                        '401 W Gowe St, Kent, WA 98032',                  47.3809, -122.2348, 75,  'APPLIED',    0, 5),
('Nancy',   'Perry',    'nancy.perry@example.com',    '555-0514', 'SQL,Python,Tableau,Statistics,Data Visualization,Excel,Power BI',            '9706 NE 180th St, Bothell, WA 98011',            47.7623, -122.2054, 420, 'HIRED',      0, 5);

-- Job 6: Frontend Developer @ Acme Technologies, Denver (job_id = 6) — 15 candidates
INSERT INTO candidate (first_name, last_name, email, phone, skills, address, latitude, longitude, last_assignment_days, stage, stage_order, job_id) VALUES
('Adam',    'Powell',   'adam.powell@example.com',    '555-0601', 'Angular,TypeScript,HTML/CSS,JavaScript,REST API',                            '1290 Williams St, Denver, CO 80218',             39.7317, -104.9768, 120, 'APPLIED',    0, 6),
('Brenda',  'Long',     'brenda.long@example.com',    '555-0602', 'Angular,TypeScript,RxJS,SCSS,HTML/CSS,JavaScript,REST API',                  '15551 E Broncos Pkwy, Aurora, CO 80016',          39.6884, -104.7729, 450, 'HIRED',      0, 6),
('Carlos',  'Patterson','carlos.patterson@example.com','555-0603','React,TypeScript,HTML/CSS,JavaScript,CSS',                                   '6001 S Broadway, Littleton, CO 80120',           39.6133, -105.0166, 90,  'APPLIED',    0, 6),
('Donna',   'Hughes',   'donna.hughes@example.com',   '555-0604', 'Angular,TypeScript,HTML/CSS,JavaScript,SCSS',                               '385 S Colorado Blvd, Denver, CO 80246',          39.7167, -104.9517, 300, 'SCREENING',  0, 6),
('Ethan',   'Flores',   'ethan.flores@example.com',   '555-0605', 'Angular,RxJS,TypeScript,HTML/CSS,SCSS,JavaScript',                          '2580 55th St, Boulder, CO 80301',                40.0150, -105.2705, 540, 'INTERVIEW',  0, 6),
('Faith',   'Washington','faith.washington@example.com','555-0606','Angular,TypeScript,JavaScript,REST API,HTML/CSS',                           '7001 W Colfax Ave, Lakewood, CO 80214',          39.7393, -105.0814, 60,  'APPLIED',    0, 6),
('Glen',    'Butler',   'glen.butler@example.com',    '555-0607', 'Vue.js,JavaScript,HTML/CSS,SCSS',                                           '9901 Grant St, Thornton, CO 80229',              39.8680, -104.9719, 180, 'APPLIED',    0, 6),
('Holly',   'Simmons',  'holly.simmons@example.com',  '555-0608', 'Angular,TypeScript,RxJS,SCSS,HTML/CSS,REST API,JavaScript',                  '9111 S Ridgeline Blvd, Highlands Ranch, CO 80129',39.5480, -104.9697, 365, 'ASSESSMENT', 0, 6),
('Ike',     'Foster',   'ike.foster@example.com',     '555-0609', 'Angular,TypeScript,HTML/CSS,JavaScript',                                    '801 12th St, Golden, CO 80401',                  39.7555, -105.2211, 150, 'APPLIED',    0, 6),
('Jade',    'Gonzales', 'jade.gonzales@example.com',  '555-0610', 'Angular,TypeScript,SCSS,RxJS,HTML/CSS,JavaScript,REST API',                  '4600 E 14th Ave, Denver, CO 80220',              39.7414, -104.9316, 480, 'OFFER',      0, 6),
('Kyle',    'Bryant',   'kyle.bryant@example.com',    '555-0611', 'TypeScript,JavaScript,HTML/CSS,Angular',                                    '8200 Turnpike Dr, Westminster, CO 80030',        39.8367, -105.0372, 75,  'APPLIED',    0, 6),
('Luna',    'Alexander','luna.alexander@example.com', '555-0612', 'Angular,TypeScript,RxJS,HTML/CSS,SCSS,REST API',                             '2700 Champa St, Denver, CO 80205',               39.7536, -104.9719, 270, 'INTERVIEW',  1, 6),
('Max',     'Russell',  'max.russell@example.com',    '555-0613', 'React,JavaScript,HTML/CSS,TypeScript',                                      '6889 S Holly St, Centennial, CO 80122',          39.5931, -104.8918, 45,  'APPLIED',    0, 6),
('Nora',    'Griffin',  'nora.griffin@example.com',   '555-0614', 'Angular,TypeScript,HTML/CSS,JavaScript,SCSS,RxJS',                          '3000 S Logan St, Englewood, CO 80113',           39.6478, -104.9878, 365, 'SCREENING',  1, 6),
('Omar',    'Diaz',     'omar.diaz@example.com',      '555-0615', 'Angular,TypeScript,RxJS,SCSS,HTML/CSS,JavaScript,REST API',                  '2400 W Drake Rd, Fort Collins, CO 80526',        40.5853, -105.0844, 600, 'REJECTED',   0, 6);

-- System job: Talent Pool (used to hold candidates not yet assigned to a specific opening)
INSERT INTO job (employer, title, department, location, status, employment_type)
VALUES ('SYSTEM', 'Talent Pool', 'Talent Pool', 'N/A', 'ON_HOLD', 'FULL_TIME');
