<?php
// Docker 环境数据库配置
define('DB_DRIVER', getenv('DB_DRIVER') ?: 'sqlite'); // sqlite (default) or mysql
define('DB_PATH', getenv('DB_PATH') ?: (__DIR__ . '/../database.sqlite'));
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'author');
define('DB_USER', getenv('DB_USER') ?: 'author');
define('DB_PASS', getenv('DB_PASS') ?: 'author');

class Database {
    private static $instance = null;
    private $conn;
    
    private function __construct() {
        try {
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ];

            if (DB_DRIVER === 'sqlite') {
                $dsn = 'sqlite:' . DB_PATH;
                $username = null;
                $password = null;
            } else {
                $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                $username = DB_USER;
                $password = DB_PASS;
                $options[PDO::ATTR_EMULATE_PREPARES] = false;
            }

            $this->conn = new PDO($dsn, $username, $password, $options);

            if (DB_DRIVER === 'sqlite') {
                $this->conn->exec('PRAGMA foreign_keys = ON;');
            }
        } catch(PDOException $e) {
            die("Database connection failed: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->conn;
    }
}

