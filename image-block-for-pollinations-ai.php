<?php
/**
 * Plugin Name:       Image Block for Pollinations.ai
 * Description:       WordPress block for generating image using Pollination AI and insert into content & media library
 * Requires at least: 6.6
 * Requires PHP:      7.4.0
 * Version:           1.0.1
 * Author:            Aslam Doctor
 * Author URI:        https://aslamdoctor.com
 * Developer:         Aslam Doctor
 * Developer URI:     https://aslamdoctor.com/
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       image-block-for-pollinations-ai
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
function ibpai_create_block_init() {
	register_block_type( __DIR__ . '/build' );

	// Localize script to pass nonce to JavaScript.
	wp_localize_script(
		'create-block-image-block-for-pollinations-ai-editor-script',
		'ibpaiMediaGenerator',
		array(
			'nonce' => wp_create_nonce( 'image-block-for-pollinations-ai-nonce' ),
		)
	);
}
add_action( 'init', 'ibpai_create_block_init' );


/**
 * Register ajax request to store image in media library.
 *
 * @return void
 */
function ibpai_save_image() {
	if ( isset( $_POST['nonce'] ) && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'image-block-for-pollinations-ai-nonce' ) ) {
		// Get the base64 data.
		$image_data = isset( $_POST['image_data'] ) ? sanitize_text_field( wp_unslash( $_POST['image_data'] ) ) : '';
		$filename   = 'image-block-for-pollinations-ai-' . time() . '.jpg';

		// Decode base64 data.
		$decoded_image = base64_decode( $image_data ); //phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode

		// Get WordPress upload directory.
		$upload_dir = wp_upload_dir();

		// Create temporary file.
		$temp_file = $upload_dir['path'] . '/' . $filename;

		// Use WP_Filesystem instead of direct file operations.
		global $wp_filesystem;
		if ( ! function_exists( 'WP_Filesystem' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}
		WP_Filesystem();
		$wp_filesystem->put_contents( $temp_file, $decoded_image, FS_CHMOD_FILE );

		// Prepare file array for media library.
		$file_array = array(
			'name'     => $filename,
			'tmp_name' => $temp_file,
		);

		// Check file type.
		$filetype = wp_check_filetype( basename( $temp_file ), null );
		if ( ! $filetype['type'] ) {
				wp_delete_file( $temp_file );
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
		if ( file_exists( $temp_file ) ) {
			wp_delete_file( $temp_file );
		}

		if ( is_wp_error( $attachment_id ) ) {
				wp_send_json_error( $attachment_id->get_error_message() );
				return;
		}

		if ( isset( $_POST['nonce'] ) && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'image-block-for-pollinations-ai-nonce' ) ) {
			$prompt_text = isset( $_POST['prompt_text'] ) ? sanitize_text_field( wp_unslash( $_POST['prompt_text'] ) ) : '';

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
	}
}

add_action( 'wp_ajax_ibpai_save_image', 'ibpai_save_image' );


/**
 * Add sponsor link to plugin listing page.
 *
 * @param [Array]  $links All links related to specific plugin under Admin>Plugins section.
 * @param [String] $file The plugin file path.
 */
function ibpai_sponsor_link( $links, $file ) {
	if ( plugin_basename( __FILE__ ) === $file ) {
		$links[] = '<a href="https://github.com/sponsors/aslamdoctor"><span class="dashicons dashicons-star-filled" aria-hidden="true" style="font-size:14px;line-height:1.3"></span>' . __( 'Sponsor', 'image-block-for-pollinations-ai' ) . '</a>';
	}
	return $links;
}
add_filter( 'plugin_row_meta', 'ibpai_sponsor_link', 10, 2 );
