<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Twig\Environment;

class MailerController
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly Environment $twig,
    ) {
    }

    /**
     * Envoie un email HTML (+ texte brut automatique) depuis no-reply@medatwork.be.
     *
     * @param string   $to         Adresse du destinataire
     * @param string   $subject    Sujet de l'email
     * @param string   $template   Chemin du template Twig (ex: email/activationEmail.html.twig)
     * @param array<string, mixed> $parameters Variables transmises au template
     * @param string   $replyTo    Adresse Reply-To (support@ par défaut)
     */
    /**
     * @param string[] $ccList Additional CC addresses
     */
    public function sendEmail(
        string $to,
        string $subject,
        string $template,
        array $parameters,
        string $replyTo = 'support@medatwork.be',
        array $ccList = []
    ): void {
        $html = $this->twig->render($template, $parameters);

        // Version texte brut extraite du HTML pour éviter le spam
        $text = strip_tags(html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $text = preg_replace('/[ \t]+/', ' ', $text) ?? $text;
        $text = preg_replace('/(\s*\n){3,}/', "\n\n", $text) ?? $text;

        $email = (new Email())
            ->from(new Address('no-reply@medatwork.be', 'MED@WORK'))
            ->to($to)
            ->replyTo($replyTo)
            ->subject($subject)
            ->text(trim($text))
            ->html($html);

        foreach ($ccList as $cc) {
            $email->addCc($cc);
        }

        $this->mailer->send($email);
    }

    /**
     * Envoie un email HTML avec un PDF en pièce jointe.
     *
     * @param string $to
     * @param string $subject
     * @param string $htmlBody       Corps HTML brut (pas un template Twig)
     * @param string $pdfBase64      PDF encodé en base64
     * @param string $attachmentName Nom du fichier joint
     */
    public function sendEmailWithPdfAttachment(
        string $to,
        string $subject,
        string $htmlBody,
        string $pdfBase64,
        string $attachmentName = 'planning.pdf'
    ): void {
        $text = strip_tags(html_entity_decode($htmlBody, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $text = preg_replace('/[ \t]+/', ' ', $text) ?? $text;

        $email = (new Email())
            ->from(new Address('no-reply@medatwork.be', 'MED@WORK'))
            ->to($to)
            ->replyTo('support@medatwork.be')
            ->subject($subject)
            ->text(trim($text))
            ->html($htmlBody)
            ->attach(base64_decode($pdfBase64), $attachmentName, 'application/pdf');

        $this->mailer->send($email);
    }
}
