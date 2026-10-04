#!/usr/bin/env perl
# Computes CSP sha256 hashes for every inline script and inline event handler in the HTML of
# the given directories (the prerendered site and the pages rendered by render-ssr-pages.mjs)
# and injects them into nginx.conf (placeholder __CSP_SCRIPT_HASHES__).
#
# Usage: perl csp-hashes.pl <html-dir>... <nginx.conf>
use strict;
use warnings;
use Digest::SHA qw(sha256_base64);
use File::Find;

die "usage: $0 <html-dir>... <nginx.conf>\n" unless @ARGV >= 2;
my $conf = pop @ARGV;
my @sites = @ARGV;

my %js_types = map { $_ => 1 } ('', 'text/javascript', 'application/javascript', 'module');
my (%hashes, $has_handlers);

sub csp_hash {
  my $b64 = sha256_base64(shift);
  $b64 .= '=' x ((4 - length($b64) % 4) % 4);
  return "'sha256-$b64'";
}

sub decode_entities {
  my $s = shift;
  $s =~ s/&quot;/"/g;
  $s =~ s/&#39;|&apos;/'/g;
  $s =~ s/&lt;/</g;
  $s =~ s/&gt;/>/g;
  $s =~ s/&amp;/&/g;
  return $s;
}

my @pages;
for my $site (@sites) {
  my $before = @pages;
  find(sub { push @pages, $File::Find::name if /\.html$/ }, $site);
  die "no HTML files found in $site\n" if @pages == $before;
}

for my $page (@pages) {
  open my $fh, '<:raw', $page or die "cannot read $page: $!\n";
  my $html = do { local $/; <$fh> };
  close $fh;

  while ($html =~ m{<script\b([^>]*)>(.*?)</script>}gis) {
    my ($attrs, $body) = ($1, $2);
    next if $attrs =~ /\bsrc\s*=/i;
    my ($type) = $attrs =~ /\btype\s*=\s*["']?([^"'\s>]+)/i;
    next unless $js_types{ lc($type // '') };
    $hashes{ csp_hash($body) } = 1;
  }

  (my $markup = $html) =~ s{<script\b.*?</script>}{}gis;
  while ($markup =~ m{<[a-zA-Z][^>]*>}g) {
    my $tag = $&;
    while ($tag =~ /\son[a-z]+\s*=\s*(?:"([^"]*)"|'([^']*)')/gi) {
      $hashes{ csp_hash(decode_entities($1 // $2)) } = 1;
      $has_handlers = 1;
    }
  }
}

die "no inline scripts found; refusing to emit an empty CSP hash list\n" unless %hashes;

my $sources = join ' ', sort keys %hashes;
$sources = "'unsafe-hashes' $sources" if $has_handlers;

open my $in, '<', $conf or die "cannot read $conf: $!\n";
my $config = do { local $/; <$in> };
close $in;

my $count = $config =~ s/__CSP_SCRIPT_HASHES__/$sources/g;
die "placeholder __CSP_SCRIPT_HASHES__ not found in $conf\n" unless $count;

open my $out, '>', $conf or die "cannot write $conf: $!\n";
print $out $config;
close $out;

print "CSP script sources: $sources\n";
