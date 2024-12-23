<?php
/**
 * Plugin Name:       AI Media Generator
 * Description:       Block for generating image using AI and then insert it into content & media library.
 * Requires at least: 6.6
 * Requires PHP:      7.2
 * Version:           0.1.0
 * Author:            The WordPress Contributors
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       ai-media-generator
 *
 * @package CreateBlock
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function create_block_ai_media_generator_block_init() {
	register_block_type( __DIR__ . '/build' );
}
add_action( 'init', 'create_block_ai_media_generator_block_init' );


/**
 * Register ajax request to store image in media library.
 *
 * @return void
 */
function ai_media_generator_save_image() {
	// Get the base64 data.
	$image_data = $_POST['image_data'];
	$filename   = 'ai-media-generator-' . time() . '.jpg';

	// Decode base64 data.
	$decoded_image = base64_decode( $image_data );

	// Get WordPress upload directory.
	$upload_dir = wp_upload_dir();

	// Create temporary file.
	$temp_file = $upload_dir['path'] . '/' . $filename;
	file_put_contents( $temp_file, $decoded_image );

	// Prepare file array for media library.
	$file_array = array(
		'name'     => $filename,
		'tmp_name' => $temp_file,
	);

	// Check file type.
	$filetype = wp_check_filetype( basename( $temp_file ), null );
	if ( ! $filetype['type'] ) {
			unlink( $temp_file );
			wp_send_json_error( 'Invalid file type' );
			return;
	}

	// Required for media_handle_sideload.
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';

	// Insert into media library.
	$attachment_id = media_handle_sideload( $file_array, 0 );

	// Clean up.
	@unlink( $temp_file );

	if ( is_wp_error( $attachment_id ) ) {
			wp_send_json_error( $attachment_id->get_error_message() );
			return;
	}

	$prompt_text = $_POST['prompt_text'] ?? '';

	// Update the post content of the attachment (used for the description).
	wp_update_post(
		array(
			'ID'           => $attachment_id,
			'post_content' => sanitize_text_field( $prompt_text ),
		)
	);

	// set alt text of the image.
	update_post_meta( $attachment_id, '_wp_attachment_image_alt', sanitize_text_field( $prompt_text ) );

	// Return success response.
	wp_send_json_success(
		array(
			'attachment_id' => $attachment_id,
			'url'           => wp_get_attachment_url( $attachment_id ),
		)
	);
}

add_action( 'wp_ajax_ai_media_generator_save_image', 'ai_media_generator_save_image' );
