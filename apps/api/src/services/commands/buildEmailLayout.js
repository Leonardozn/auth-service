/**
 * Escapes the few characters that would let an interpolated value break out of the markup.
 * Everything that reaches a template comes from configuration or from a generated value, so this is
 * a guard rail rather than a defence - but a brand name with an ampersand is enough to produce a
 * broken email, and that is reason enough.
 */
const escapeHtml = (value) => String(value ?? '')
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')

class BuildEmailLayout {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new BuildEmailLayout()
		return this.instance
	}

	/**
	 * Wraps a body fragment in the branded shell shared by every transactional email.
	 *
	 * **Tables and inline styles, not flexbox and a stylesheet.** Outlook renders with Word's engine
	 * and Gmail strips `<style>` blocks on forwarded mail, so the layout techniques that are correct
	 * on the web are exactly the ones that fall apart here. This is not legacy code to be modernised.
	 *
	 * **Every colour is written out, including the white background.** Mail clients in dark mode
	 * invert what they consider unspecified, so an unstated background turns dark under text that
	 * stays dark - the email arrives unreadable for the people most likely to open it at night.
	 *
	 * The brand colour is what makes the message recognisable before it is read: it fills the header
	 * band and the accent colour carries the one thing the reader came for, so the email looks like
	 * the store it came from and not like a system notice.
	 *
	 * @param { Object } config
	 * @param { Object } config.brand - { name, logoUrl, primaryColor, accentColor, url }.
	 * @param { String } config.preheader - The line inbox previews show; hidden inside the message.
	 * @param { String } config.heading - The email's own title, inside the card.
	 * @param { String } config.body - Already-escaped HTML for the middle of the card.
	 * @param { String } config.footer - Plain-text closing note.
	 * @returns { String } The complete HTML document.
	 */
	execute({ brand, preheader, heading, body, footer }) {
		const name = escapeHtml(brand.name)
		const primary = escapeHtml(brand.primaryColor)
		const logo = brand.logoUrl
			? `<img src="${escapeHtml(brand.logoUrl)}" alt="${name}" width="160" style="max-width:160px;height:auto;display:block;margin:0 auto;border:0;" />`
			: `<span style="font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:bold;color:#ffffff;">${name}</span>`

		// El encabezado enlaza a la tienda solo si se configuró su dirección: un logo que no lleva a
		// ninguna parte se pulsa igual y no pasa nada, y eso se lee como un correo roto.
		const header = brand.url
			? `<a href="${escapeHtml(brand.url)}" style="text-decoration:none;">${logo}</a>`
			: logo

		return `<!doctype html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;padding:24px 12px;">
	<tr><td align="center">
		<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
			<tr><td align="center" style="background-color:${primary};border-radius:12px 12px 0 0;padding:24px;">${header}</td></tr>
			<tr><td style="background-color:#ffffff;padding:32px 28px;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
				<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#1a1a1a;">${escapeHtml(heading)}</h1>
				${body}
			</td></tr>
			<tr><td style="background-color:#ffffff;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;padding:20px 28px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;">
				${escapeHtml(footer)}
			</td></tr>
			<tr><td align="center" style="padding:16px 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#9ca3af;">${name}</td></tr>
		</table>
	</td></tr>
</table>
</body>
</html>`
	}
}

module.exports = BuildEmailLayout
module.exports.escapeHtml = escapeHtml
