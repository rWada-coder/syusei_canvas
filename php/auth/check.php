<?php
require_once __DIR__ . '/../common.php';

if (isset($_SESSION['user_email'])) {
  echo json_encode([
    'loggedIn' => true,
    'user_email' => $_SESSION['user_email'],
    'user_name' => $_SESSION['user_name']
  ]);
} else {
  echo json_encode(['loggedIn' => false]);
  // http_response_code(401);
}

