-- SplitEase/sql/add_password_tokens.sql

CREATE TABLE PasswordResetTokens (
    token_id   INT PRIMARY KEY AUTO_INCREMENT,
    user_id    INT NOT NULL,
    token      VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used       TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);