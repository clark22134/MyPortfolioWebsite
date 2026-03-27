-- ATS Database Schema

CREATE TABLE job (
    id              BIGSERIAL PRIMARY KEY,
    employer        VARCHAR(255) NOT NULL DEFAULT '',
    title           VARCHAR(255) NOT NULL,
    department      VARCHAR(255) NOT NULL,
    location        VARCHAR(255) NOT NULL,
    description     TEXT,
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

-- Seed data: sample jobs
INSERT INTO job (employer, title, department, location, description, status, employment_type) VALUES
('Acme Technologies', 'Senior Software Engineer', 'Engineering', 'San Francisco, CA (Remote)', 'We are looking for a Senior Software Engineer to join our backend platform team. You will design and build scalable microservices, mentor junior engineers, and drive architecture decisions.', 'OPEN', 'FULL_TIME'),
('Pixel Creative', 'Product Designer', 'Design', 'New York, NY (Hybrid)', 'Join our product design team to craft intuitive user experiences across our SaaS platform. You will work closely with product managers and engineers from ideation to launch.', 'OPEN', 'FULL_TIME'),
('Acme Technologies', 'DevOps Engineer', 'Engineering', 'Austin, TX (Remote)', 'Seeking a DevOps Engineer to build and maintain our CI/CD pipelines, infrastructure-as-code, and observability stack on AWS.', 'OPEN', 'FULL_TIME'),
('GrowthMedia', 'Marketing Intern', 'Marketing', 'Chicago, IL (On-site)', 'Summer internship opportunity to support the marketing team with campaign analytics, content creation, and social media management.', 'OPEN', 'INTERNSHIP'),
('DataBridge Inc', 'Data Analyst', 'Data', 'Seattle, WA (Hybrid)', 'Analyze large datasets to uncover insights that drive business decisions. Experience with SQL, Python, and BI tools required.', 'DRAFT', 'FULL_TIME'),
('Acme Technologies', 'Frontend Developer', 'Engineering', 'Denver, CO (Remote)', 'Build pixel-perfect, accessible user interfaces with Angular and TypeScript. Collaborate with designers and backend engineers.', 'CLOSED', 'CONTRACT');

-- Seed data: sample candidates for "Senior Software Engineer" (job_id = 1)
INSERT INTO candidate (first_name, last_name, email, phone, stage, stage_order, job_id) VALUES
('Alice', 'Johnson', 'alice.johnson@example.com', '555-0101', 'INTERVIEW', 0, 1),
('Bob', 'Smith', 'bob.smith@example.com', '555-0102', 'SCREENING', 0, 1),
('Carol', 'Williams', 'carol.williams@example.com', '555-0103', 'APPLIED', 0, 1),
('David', 'Brown', 'david.brown@example.com', '555-0104', 'ASSESSMENT', 0, 1),
('Eve', 'Davis', 'eve.davis@example.com', '555-0105', 'OFFER', 0, 1),
('Frank', 'Miller', 'frank.miller@example.com', '555-0106', 'APPLIED', 1, 1);

-- Seed data: sample candidates for "Product Designer" (job_id = 2)
INSERT INTO candidate (first_name, last_name, email, phone, stage, stage_order, job_id) VALUES
('Grace', 'Lee', 'grace.lee@example.com', '555-0201', 'SCREENING', 0, 2),
('Hank', 'Wilson', 'hank.wilson@example.com', '555-0202', 'INTERVIEW', 0, 2),
('Iris', 'Taylor', 'iris.taylor@example.com', '555-0203', 'APPLIED', 0, 2);

-- Seed data: sample candidates for "DevOps Engineer" (job_id = 3)
INSERT INTO candidate (first_name, last_name, email, phone, stage, stage_order, job_id) VALUES
('Jack', 'Anderson', 'jack.anderson@example.com', '555-0301', 'HIRED', 0, 3),
('Karen', 'Thomas', 'karen.thomas@example.com', '555-0302', 'REJECTED', 0, 3),
('Leo', 'Martinez', 'leo.martinez@example.com', '555-0303', 'SCREENING', 0, 3);
