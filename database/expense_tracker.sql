-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
<<<<<<< HEAD
-- Generation Time: Mar 24, 2026 at 06:44 PM
=======
-- Generation Time: Mar 24, 2026 at 06:07 PM
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `expense_tracker`
--
CREATE DATABASE IF NOT EXISTS `expense_tracker` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `expense_tracker`;

-- --------------------------------------------------------

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
CREATE TABLE `alerts` (
  `alert_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `budget_id` int(11) NOT NULL,
  `threshold_percent` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `alerts`
--

INSERT INTO `alerts` (`alert_id`, `user_id`, `budget_id`, `threshold_percent`) VALUES
(1, 1, 1, 75),
(2, 1, 1, 56),
(3, 1, 1, 88),
(4, 1, 1, 76);

-- --------------------------------------------------------

--
-- Table structure for table `budgets`
--

DROP TABLE IF EXISTS `budgets`;
CREATE TABLE `budgets` (
  `budget_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `spent` decimal(10,2) DEFAULT 0.00,
  `month` int(11) DEFAULT 1,
  `color` varchar(7) DEFAULT '#ffcc00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `budgets`
--

INSERT INTO `budgets` (`budget_id`, `user_id`, `name`, `icon`, `amount`, `spent`, `month`, `color`) VALUES
<<<<<<< HEAD
(1, 1, 'General', NULL, 975933.00, 0.00, 3, '#ffcc00'),
(2, 1, 'Transport', '🚗', 77.00, 0.00, 1, '#ffcc00'),
(3, 1, 'Electronics', '📱', 77.00, 0.00, 1, '#ffcc00');
=======
(20, 1, 'Shopping ', '👕', 2500.00, 0.00, 1, '#ffcc00'),
(25, 1, 'Home', '🏠', 25000.00, 0.00, 1, '#ffcc00'),
(31, 1, 'Food', '🍽️', 34567.00, 0.00, 1, '#ffcc00'),
(32, 1, 'Electronics', '📱', 4567.00, 0.00, 1, '#ffcc00'),
(33, 1, 'Electronics', '📱', 90.00, 0.00, 1, '#ffcc00');
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`category_id`, `user_id`, `name`, `type`, `created_at`) VALUES
<<<<<<< HEAD
(1, 1, 'General', 'expense', '2026-03-23 17:17:03');
=======
(1, 1, 'Food ', 'expense', '2026-03-15 11:26:12'),
(2, 2, 'food', 'expense', '2026-03-19 13:27:29');
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

<<<<<<< HEAD
DROP TABLE IF EXISTS `expenses`;
=======
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)
CREATE TABLE `expenses` (
  `expense_id` int(11) NOT NULL,
  `budget_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` date NOT NULL
<<<<<<< HEAD
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `otps`
--

DROP TABLE IF EXISTS `otps`;
CREATE TABLE `otps` (
  `otp_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `otp_code` varchar(10) NOT NULL,
  `purpose` varchar(50) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
=======
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `transaction_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `transaction_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`transaction_id`, `user_id`, `category_id`, `amount`, `type`, `description`, `transaction_date`) VALUES
<<<<<<< HEAD
(1, 1, 1, 6000.00, 'expense', 'Test expense', '2026-03-23');
=======
(1, 2, 1, 4000.00, 'expense', 'school', '2026-03-03');
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
<<<<<<< HEAD
=======
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `is_verified`, `created_at`) VALUES
(1, 'test', 'test@test.com', '$2b$10$YUPhXWtNK1ivEjSkE.3CsuQvIsFXDoQS/x3jt/1WlxQPiGhkYHCQ2', 1, '2026-03-15 11:24:51'),
(2, 'School', 'school@gmail.com', '$2b$10$YUPhXWtNK1ivEjSkE.3CsuQvIsFXDoQS/x3jt/1WlxQPiGhkYHCQ2', 1, '2026-03-16 15:08:07'),
(3, 'user1', 'user1@gmail.com', '$2b$10$YUPhXWtNK1ivEjSkE.3CsuQvIsFXDoQS/x3jt/1WlxQPiGhkYHCQ2', 1, '2026-03-19 13:26:23');

-- --------------------------------------------------------

--
-- Table structure for table `otps`
--

CREATE TABLE `otps` (
  `otp_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `otp_code` varchar(10) NOT NULL,
  `purpose` varchar(50) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `is_verified`, `created_at`) VALUES
(1, 'Test User', 'test@example.com', '$2b$10$9UPAUOWQOKbbT3g1/LT3TeL5ZZQ82CGKtVrrVW/Zcu4BFUgFvuQia', 1, '2026-03-23 17:17:03');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `alerts`
--
ALTER TABLE `alerts`
  ADD PRIMARY KEY (`alert_id`),
  ADD KEY `budget_id` (`budget_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `budgets`
--
ALTER TABLE `budgets`
  ADD PRIMARY KEY (`budget_id`),
<<<<<<< HEAD
  ADD KEY `user_id` (`user_id`),
=======
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)
  ADD KEY `user_id_month` (`user_id`,`month`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`expense_id`),
  ADD KEY `budget_id` (`budget_id`);

--
-- Indexes for table `otps`
--
ALTER TABLE `otps`
  ADD PRIMARY KEY (`otp_id`),
  ADD KEY `email` (`email`),
  ADD KEY `purpose` (`purpose`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `name` (`name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `alerts`
--
ALTER TABLE `alerts`
  MODIFY `alert_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `budgets`
--
ALTER TABLE `budgets`
<<<<<<< HEAD
  MODIFY `budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
=======
  MODIFY `budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
<<<<<<< HEAD
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
=======
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `expense_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `otps`
--
ALTER TABLE `otps`
  MODIFY `otp_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
<<<<<<< HEAD
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
=======
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;
>>>>>>> 887d911 (Align backend auth and alerts with MySQL schema)

--
-- Constraints for dumped tables
--

--
-- Constraints for table `alerts`
--
ALTER TABLE `alerts`
  ADD CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`budget_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `alerts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `budgets`
--
ALTER TABLE `budgets`
  ADD CONSTRAINT `budgets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`budget_id`) REFERENCES `budgets` (`budget_id`) ON DELETE CASCADE;

--
-- Constraints for table `otps`
--
ALTER TABLE `otps`
  ADD CONSTRAINT `otps_ibfk_1` FOREIGN KEY (`email`) REFERENCES `users` (`email`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;