CREATE TABLE `inquiry_paths` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`technique` text DEFAULT 'elenchus' NOT NULL,
	`current_understanding` text NOT NULL,
	`questions` text NOT NULL,
	`exploration_paths` text,
	`next_steps` text,
	`cognitive_load` text DEFAULT 'intermediate' NOT NULL,
	`user_responses` text,
	`is_completed` integer DEFAULT false NOT NULL,
	`insights_generated` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `thinking_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `problem_canvases` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`initial_statement` text NOT NULL,
	`core_issue` text,
	`sub_problems` text,
	`constraints` text,
	`assumptions` text,
	`stakeholders` text,
	`success_criteria` text,
	`assumption_mappings` text,
	`domain` text NOT NULL,
	`urgency` text DEFAULT 'medium' NOT NULL,
	`prior_attempts` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `thinking_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reflection_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`confidence` integer DEFAULT 5 NOT NULL,
	`impact` text DEFAULT 'medium' NOT NULL,
	`tags` text,
	`follow_up_questions` text,
	`action_items` text,
	`related_concepts` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `thinking_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `resource_curations` (
	`id` text PRIMARY KEY NOT NULL,
	`inquiry_path_id` text,
	`type` text DEFAULT 'documentation' NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`description` text NOT NULL,
	`why_relevant` text NOT NULL,
	`cognitive_load` text DEFAULT 'intermediate' NOT NULL,
	`estimated_time` integer DEFAULT 10 NOT NULL,
	`prerequisite_knowledge` text,
	`follow_up_resources` text,
	`context` text NOT NULL,
	`domain` text NOT NULL,
	`tags` text,
	`is_validated` integer DEFAULT false NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`effectiveness_rating` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`inquiry_path_id`) REFERENCES `inquiry_paths`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `thinking_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`initial_statement` text NOT NULL,
	`status` text DEFAULT 'initiated' NOT NULL,
	`domain` text NOT NULL,
	`complexity` text DEFAULT 'intermediate' NOT NULL,
	`preferred_technique` text DEFAULT 'elenchus' NOT NULL,
	`urgency` text DEFAULT 'medium' NOT NULL,
	`prior_attempts` text,
	`learning_goals` text,
	`current_stage` text,
	`completed_stages` text,
	`insights_generated` integer DEFAULT 0 NOT NULL,
	`questions_explored` integer DEFAULT 0 NOT NULL,
	`resources_consulted` integer DEFAULT 0 NOT NULL,
	`reflection_points` integer DEFAULT 0 NOT NULL,
	`current_understanding` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
