"use client";

import Link from "next/link";

import { useState, useEffect, useRef } from "react";
import { useStore, User } from "@/store";
import { getDictionary, LANGUAGES, Dict } from "@/lib/i18n";
import { platformColor, categoryLabel, platformLabel } from "@/lib/totp";
import { money } from "@/lib/money";
import { BuyModal } from "./widgets/buy-modal";
import { ChatWidget } from "./widgets/chat-widget";

interface Vendor { id: string; username: string; vendorCountry?: string; vendorStatus?: string; }
interface Product {
  id: string; title: string; platform: string; category: string;
  vendorPrice: number; storePrice: number; stock: number; status: string;
  deliveryFormat: string; countryRegister: string; originalMail: boolean;
  country: string; vendor: Vendor;
}
interface Listing {
  id: string; title: string; platform: string; category: string;
  deliveryFormat: string; countryRegister: string; originalMail: boolean;
  country: string; products: Product[]; bestSeller?: boolean;
}
interface TrendingProduct extends Product {
  avgRating: number; ratingCount: number;
  listing?: { id: string; title: string; platform: string } | null;
}
interface PlatformGroup {
  platform: string; label: string; icon: string; color: string;
  listings: Listing[]; totalStock: number; totalListings: number;
}
interface Props {
  platforms: PlatformGroup[];
  trending: TrendingProduct[];
  totalListings: number;
  totalPlatforms: number;
  totalStock: number;
}

const PLATFORM_ICONS: Record<string, { svg: string; color: string }> = {
  instagram: {
    color: "#E1306C",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`
  },
  facebook: {
    color: "#1877F2",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
  },
  telegram: {
    color: "#0088CC",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.013-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`
  },
  x: {
    color: "#000000",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`
  },
  twitter: {
    color: "#1DA1F2",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/></svg>`
  },
  tiktok: {
    color: "#000000",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`
  },
  linkedin: {
    color: "#0A66C2",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`
  },
  gmail: {
    color: "#EA4335",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>`
  },
  outlook: {
    color: "#0078D4",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M24 7.194v10.942c0 1.667-1.356 3.024-3.023 3.024H3.023C1.356 21.16 0 19.803 0 18.136V7.194c0-1.667 1.356-3.023 3.023-3.023h17.954c1.667 0 3.023 1.356 3.023 3.023zM6.814 14.453c0 .486.22.918.596 1.182.42.297.974.461 1.572.461.582 0 1.114-.157 1.462-.427a1.642 1.642 0 0 0 .566-1.155 1.56 1.56 0 0 0-.454-1.096 2.138 2.138 0 0 0-1.598-.603c-.59 0-1.092.173-1.497.514-.302.255-.537.555-.646.884l.002-.002v-3.63h-1.83v7.192h1.83V12.97c.182-.44.442-.828.768-1.12.437-.394.988-.621 1.586-.621.754 0 1.372.281 1.782.81.355.457.54 1.025.54 1.66 0 .492-.122.967-.366 1.408-.24.43-.583.805-1.014 1.105.625.36 1.126.852 1.47 1.454.395.689.584 1.459.584 2.282 0 .703-.168 1.362-.503 1.944-.323.563-.773 1.014-1.333 1.322-.658.358-1.4.544-2.186.544-.942 0-1.772-.26-2.454-.762-.615-.453-1.082-1.088-1.377-1.85h.008zM14.898 13.097v4.697h1.91v-4.697h2.55V11.3h-2.55V9.041h-1.91v2.258h-2.55v1.797h2.55z"/></svg>`
  },
  discord: {
    color: "#5865F2",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>`
  },
  reddit: {
    color: "#FF4500",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>`
  },
  youtube: {
    color: "#FF0000",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
  },
  pinterest: {
    color: "#BD081C",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>`
  },
    snapchat: {
    color: "#FFFC00",
    svg: `<svg viewBox="0 0 24 24" fill="#000000"><path d="M12.012 2C6.486 2 2 6.486 2 12.012c0 2.138.694 4.11 1.87 5.713L2 22l4.468-1.778A9.93 9.93 0 0012.012 22C17.514 22 22 17.514 22 12.012 22 6.486 17.514 2 12.012 2zm0 18.15a8.15 8.15 0 01-4.15-1.12l-.3-.18-2.52 1.01.91-2.47-.19-.3A8.12 8.12 0 013.86 12.01a8.152 8.152 0 0114.3-5.35A8.15 8.15 0 0112.01 20.15zM16.5 13.5c-.13 0-.74-.07-.85-.08a.75.75 0 01-.67-.75v-.07c-.04-.78-.36-1.4-.96-1.87.34-.06.64-.15.64-.47 0-.42-.38-.65-.92-.65-.53 0-.91.23-.91.65 0 .32.3.41.63.47-.6.47-.93 1.1-.97 1.9v.07a.75.75 0 01-.67.75c-.58.05-.84.08-1.31.08a6.1 6.1 0 1112.2 0c-.03 0-.08-.01-.11-.01z"/></svg>`
  },
  whatsapp: {
    color: "#25D366",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`
  },
  steam: {
    color: "#1B2838",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12.001-5.373 12.001-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.755-1.121-1.386-1.384c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.49 1.013 2.445-.397.957-1.49 1.412-2.45 1.023zm8.8-9.24c0-1.663-1.353-3.016-3.016-3.016-1.661 0-3.014 1.353-3.014 3.016 0 1.665 1.353 3.018 3.014 3.018 1.663 0 3.016-1.353 3.016-3.018z"/></svg>`
  },
  netflix: {
    color: "#E50914",
    svg: `<svg viewBox="0 0 24 24" fill="white"><path d="M5.398 0v.006c3.164 9.19 3.164 9.19 13.198 0V0h-3.2v13.395L12.396 5.98v13.016H9.2V5.98L8.602 13.395V0H5.398z"/></svg>`
  },
};

function ProductIcon({ platform }: { platform: string }) {
  const icon = PLATFORM_ICONS[platform];
  const color = icon?.color || "#666";
  if (icon?.svg) {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        background: color, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 5,
      }} dangerouslySetInnerHTML={{ __html: icon.svg }} />
    );
  }
  const initials: Record<string, string> = {
    instagram: "IG", facebook: "FB", telegram: "TG", x: "X", twitter: "TW",
    tiktok: "TT", linkedin: "LI", gmail: "GM", outlook: "OL", discord: "DC",
    reddit: "RD", youtube: "YT", pinterest: "PI", snapchat: "SC",
  };
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      background: color, display: "flex", alignItems: "center",
      justifyContent: "center",
      color: "white", fontSize: 10, fontWeight: 700, lineHeight: 1,
    }}>
      {initials[platform] || platform.substring(0, 2).toUpperCase()}
    </div>
  );
}

export function StorefrontClient({ platforms, trending, totalListings, totalPlatforms, totalStock }: Props) {
  const { user, setUser, theme, toggleTheme, lang, setLang } = useStore();
  const t = getDictionary(lang);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [showCat, setShowCat] = useState(false);
  const [buyListing, setBuyListing] = useState<Listing | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [depMethod, setDepMethod] = useState("crypto");
  const [depositing, setDepositing] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({});
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [contactListing, setContactListing] = useState<Listing | null>(null);
  const [contactMsg, setContactMsg] = useState("");
  // Admin inline edit
  const [editListing, setEditListing] = useState<Listing | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const catRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => { if (d.user) setUser(d.user); }).catch(() => {});
    const saved = localStorage.getItem("accsm-theme");
    if (saved) useStore.getState().setTheme(saved);
  }, [setUser]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setShowCat(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = platforms.filter(p => {
    if (platformFilter && p.platform !== platformFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.listings.some(l => l.title.toLowerCase().includes(q) || l.products.some(pr => pr.vendor.username.toLowerCase().includes(q)));
    }
    return true;
  });

  const logout = () => { fetch("/api/auth/logout", { method: "POST" }).then(() => { setUser(null); location.reload(); }); };
  const dashUrl = (r: string) => r === "admin" ? "/?page=admin-dashboard" : r === "vendor" ? "/?page=vendor-dashboard" : "/?page=user-dashboard";

  return (
    <>
      {/* TOP BAR */}
      <div className="topbar">
        <div className="news-link"><span className="news-dot" /> News</div>
        {!user && <><Link href="/?page=register" className="btn-signup">+ Sign Up</Link>
        <Link href="/?page=login" className="btn-login">Login</Link></>}
        {user && <>
          <a href={dashUrl(user.role)} style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Dashboard</a>
          <button onClick={() => setShowDeposit(true)} style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#5fa830", border: "none", borderRadius: 3, cursor: "pointer", fontWeight: 600 }}>Deposit</button>
          <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>{money(user.balance)}</span>
          <button onClick={logout} style={{ color: "#aaa", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}>Logout</button>
        </>}
        <div ref={langRef} style={{ position: "relative" }}>
          <button className="lang" onClick={() => setLangOpen(!langOpen)}>{lang.toUpperCase()}</button>
          {langOpen && (
            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 4, padding: 4, minWidth: 120, zIndex: 50 }}>
              {LANGUAGES.slice(0, 6).map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 8px", fontSize: 12, background: lang === l.code ? "#f0f7ed" : "none", border: "none", cursor: "pointer" }}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={toggleTheme} style={{ fontSize: 11 }}>{theme === "dark" ? "Light" : "Dark"}</button>
      </div>

      {/* NAV BAR */}
      <div className="navbar">
        <Link href="/?page=support" className="nav-newticket">New ticket / Ask a question</Link>
        <Link href="/" className="nav-home">Home</Link>
        <Link href="/?page=faq">FAQ</Link>
        <Link href="/?page=rules">Terms of use</Link>
        {!user && <Link href="/?page=seller-register" className="nav-seller">Become a seller</Link>}
        {user && <a href={dashUrl(user.role)} style={{ color: "#5fa830", fontWeight: 600, marginLeft: 8 }}>Dashboard</a>}
      </div>

      {/* HEADER: Logo + Category + Search */}
      <div style={{ background: "#f0f0f0", borderBottom: "1px solid #ddd", padding: "8px 0" }}>
        <div className="header-main">
          <Link href="/" className="logo-box">
            <span className="logo-accs">Accs</span><span className="logo-point">Point</span>
          </Link>

          <div ref={catRef} style={{ position: "relative" }}>
            <button className="cat-btn" onClick={() => setShowCat(!showCat)}>
              <span className="hamburger">☰</span> Select a category <span className="arrow">▾</span>
            </button>
            {showCat && (
              <div className="cat-dropdown">
                <Link href="/" onClick={() => { setPlatformFilter(null); setShowCat(false); }}>All categories</Link>
                {platforms.map(p => (
                  <a key={p.platform} href="#" onClick={e => { e.preventDefault(); setPlatformFilter(p.platform); setShowCat(false); }}>
                    {p.label} ({p.totalListings})
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="search-box">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search for accounts" />
            <button className="advanced-btn" onClick={() => setSearchQuery(searchQuery)}>
              {searchQuery ? "Search" : "Advanced search"}
            </button>
          </div>
        </div>
      </div>

      {/* NOTICE */}
      <div className="notice">
        News, promotions, coupons, announcements are published on our news site - <a href="#">accspoint.news</a>
      </div>

      {/* BREADCRUMBS */}
      <div className="breadcrumbs">Home</div>

      {/* FILTER CHIPS (when filtering) */}
      {platformFilter && (
        <div className="wrap">
          <div className="chips">
            <button className="chip active" onClick={() => setPlatformFilter(null)}>All platforms</button>
            {platforms.map(p => (
              <button key={p.platform} className={`chip ${platformFilter === p.platform ? "active" : ""}`}
                onClick={() => setPlatformFilter(platformFilter === p.platform ? null : p.platform)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCT LISTINGS */}
      {filtered.map(pg => {
        const allRows: { listing: Listing; product: Product }[] = [];
        pg.listings.forEach(listing => listing.products.forEach(product => allRows.push({ listing, product })));
        const expanded = expandedPlatforms[pg.platform];
        const visibleRows = expanded ? allRows : allRows.slice(0, 3);
        const hasMore = allRows.length > 3;
        const totalStock = allRows.reduce((s, r) => s + r.product.stock, 0);

        return (
          <div key={pg.platform} className="platform-section">
            <div className="platform-header">
              <div style={{ width: 28, flexShrink: 0 }}></div>
              <span style={{ flex: 1, fontSize: 12 }}>{pg.label} Accounts</span>
              <span className="stock-col" style={{ fontSize: 11, fontWeight: 600, color: "#E6E6E6" }}>Stock</span>
              <span className="unit-col" style={{ fontSize: 10 }}>Pcs</span>
              <span className="price-col" style={{ fontSize: 11, fontWeight: 600, color: "#E6E6E6" }}>Price Pcs</span>
              <div style={{ width: 56, flexShrink: 0, textAlign: "center" }}></div>
            </div>

            {visibleRows.map(({ listing, product }) => (
              <div key={product.id} className="product-row">
                <ProductIcon platform={product.platform} />
                <div className="product-info">
                  <div className="product-title"
                    onClick={(e) => { e.stopPropagation(); setDetailListing(listing); }}
                    style={{ cursor: "pointer" }}>
                    {listing.title}
                  </div>
                  <div className="product-desc">
                    {listing.category && `${categoryLabel(listing.category)} · `}
                    {listing.countryRegister && listing.countryRegister !== "Global" ? `${listing.countryRegister} · ` : ""}
                    {listing.originalMail ? "Email included · " : ""}
                    {listing.deliveryFormat}
                  </div>
                </div>
                <div className="product-tags">
                  <span className="tag tag-warranty">48h</span>
                  {listing.category === "fresh" && <span className="tag tag-new">NEW</span>}
                  {listing.category === "verified" && <span className="tag tag-star">★ Verified</span>}
                  {listing.category === "aged" && <span className="tag tag-star">★ Aged</span>}
                  {listing.bestSeller && <span className="tag tag-bestseller">🔥 Best Seller</span>}
                </div>
                <div className="stock-col"><strong>{product.stock.toLocaleString()}</strong></div>
                <div className="unit-col">per pc</div>
                <div className="price-col"><span className="price-from">from </span>{money(product.storePrice)}</div>
                {user?.role === 'admin' ? (
                  <button className="buy-btn" style={{ background: '#1976d2' }}
                    onClick={e => { e.stopPropagation(); setEditListing(listing); setEditTitle(listing.title); setEditDesc(listing.deliveryFormat || ''); setEditPrice(String(product.storePrice)); setEditStock(String(product.stock)); }}>
                    Edit
                  </button>
                ) : product.stock > 0 ? (
                  <button className="buy-btn"
                    onClick={e => { e.stopPropagation(); setBuyListing(listing); }}>
                    <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: "#fff" }}><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
                    Buy
                  </button>
                ) : (
                  <button className="buy-btn" style={{ background: "#888" }}
                    onClick={e => { e.stopPropagation(); setContactListing(listing); }}>
                    Contact
                  </button>
                )}
              </div>
            ))}

            {hasMore && !expanded && (
              <div className="expand-btn"
                onClick={() => setExpandedPlatforms(prev => ({ ...prev, [pg.platform]: true }))}>
                + Show {allRows.length - 3} more ({allRows.length} total)
              </div>
            )}

            {pg.listings.length === 0 && (
              <div className="product-row" style={{ justifyContent: "center", color: "#888" }}>No listings</div>
            )}
          </div>
        );
      })}

      {/* NO RESULTS */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#888", fontSize: 13 }}>No results found</div>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-left">
            <div className="footer-col">
              <h4>Marketplace</h4>
              <Link href="/">Home</Link>
              <Link href="/?page=faq">FAQ</Link>
              <Link href="/?page=rules">Rules</Link>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <Link href="/?page=login">Login</Link>
              <Link href="/?page=register">Sign Up</Link>
              <Link href="/?page=seller-register">Become a seller</Link>
            </div>
          </div>
          <div className="footer-col footer-contact">
            <h4>Contact Us</h4>
            <a href="/?page=support" className="footer-contact-link">
              <span className="footer-contact-icon" style={{ background: '#5fa830' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
              </span>
              <span>Direct Message</span>
            </a>
            <a href="https://t.me/accspoint" target="_blank" rel="noopener noreferrer" className="footer-contact-link">
              <span className="footer-contact-icon" style={{ background: '#0088CC' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.013-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </span>
              <span>Telegram</span>
            </a>
            <a href="https://facebook.com/accspoint" target="_blank" rel="noopener noreferrer" className="footer-contact-link">
              <span className="footer-contact-icon" style={{ background: '#1877F2' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </span>
              <span>Facebook</span>
            </a>
            <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="footer-contact-link">
              <span className="footer-contact-icon" style={{ background: '#25D366' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </span>
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} AccsPoint. All rights reserved.
        </div>
      </footer>

      {buyListing && <BuyModal listing={buyListing} user={user} onClose={() => setBuyListing(null)} />}

      {/* ADMIN EDIT MODAL */}
      {editListing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setEditListing(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 440, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600 }}>Edit: {editListing.title}</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#666" }}>Title</label><input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13 }} /></div>
              <div><label style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#666" }}>Description</label><textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13 }} rows={3} /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#666" }}>Price ($)</label><input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13 }} /></div>
                <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#666" }}>Stock</label><input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 13 }} /></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, padding: "8px 0", border: "1px solid #ddd", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: 13 }} onClick={() => setEditListing(null)}>Cancel</button>
                <button style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 4, background: "#3ea136", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }} onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "edit", productId: editListing.products?.[0]?.id, title: editTitle, description: editDesc, vendorPrice: editPrice, stock: editStock }) });
                    const r = await res.json();
                    if (r.success) { alert("Saved!"); setEditListing(null); location.reload(); } else alert(r.error || "Failed");
                  } catch { alert("Error saving"); }
                }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL OVERLAY */}
      {detailListing && (
        <div className="detail-overlay">
          <div className="detail-topbar">
            <button onClick={() => setDetailListing(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>&larr;</button>
            <span>{detailListing.title}</span>
            <div style={{ width: 24 }}></div>
          </div>
          <div className="detail-body">
            {/* Platform badge */}
            <div className="detail-platform" style={{ background: platformColor(detailListing.platform) }}>
              {detailListing.platform.charAt(0).toUpperCase() + detailListing.platform.slice(1)}
            </div>
            {/* Title */}
            <div className="detail-title">{detailListing.title}</div>
            {/* Tags */}
            <div className="detail-tags">
              {detailListing.category && <span className="detail-tag" style={{ background: "#e8f5e9", color: "#2e7d32" }}>{categoryLabel(detailListing.category)}</span>}
              {detailListing.countryRegister && detailListing.countryRegister !== "Global" && <span className="detail-tag">{detailListing.countryRegister}</span>}
              {detailListing.originalMail && <span className="detail-tag">Email included</span>}
              {detailListing.deliveryFormat && <span className="detail-tag">{detailListing.deliveryFormat}</span>}
              <span className="detail-tag" style={{ background: "#e8f5e9", color: "#2e7d32" }}>48h warranty</span>
            </div>
            {/* Meta */}
            <div className="detail-meta">
              <span>Platform: {detailListing.platform.charAt(0).toUpperCase() + detailListing.platform.slice(1)}</span>
              <span>Country: {detailListing.countryRegister || "Global"}</span>
              <span>Email: {detailListing.originalMail ? "Included" : "Not included"}</span>
            </div>
            {/* Vendor selection */}
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "#333" }}>Select Vendor</div>
            <div className="detail-vendors">
              {detailListing.products
                .filter(p => p.status === "approved" && p.stock > 0)
                .sort((a, b) => a.storePrice - b.storePrice)
                .map(p => (
                  <div key={p.id} className="detail-vendor-card"
                    onClick={() => { setDetailListing(null); setBuyListing(detailListing); }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.vendor.username}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{p.stock} in stock
                        {p.vendor.vendorCountry && p.vendor.vendorCountry !== "Global" && ` · ${p.vendor.vendorCountry}`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#3ea136" }}>{money(p.storePrice)}</div>
                      <div style={{ fontSize: 10, color: "#888" }}>per account</div>
                    </div>
                  </div>
                ))}
              {detailListing.products.filter(p => p.status === "approved" && p.stock > 0).length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 13 }}>
                  No vendors currently have stock.
                  <button className="buy-btn" style={{ background: "#888", marginTop: 8, marginInline: "auto" }}
                    onClick={() => { setDetailListing(null); setContactListing(detailListing); }}>
                    Contact Admin
                  </button>
                </div>
              )}
            </div>
            {/* Direct Buy */}
            {detailListing.products.some(p => p.status === "approved" && p.stock > 0) && (
              <button className="btn btn-primary" style={{ width: "100%", padding: "12px 0", fontSize: 14 }}
                onClick={() => { setDetailListing(null); setBuyListing(detailListing); }}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "#fff" }}><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
                Buy Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* CONTACT MODAL (stock=0) */}
      {contactListing && (
        <div className="modal-bg" onClick={() => { setContactListing(null); setContactMsg(""); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span style={{ fontWeight: 600 }}>Contact Admin</span>
              <button onClick={() => { setContactListing(null); setContactMsg(""); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>x</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 10, background: "#f9f9f9", borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{contactListing.title}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  Platform: {contactListing.platform} · Category: {contactListing.category} · Country: {contactListing.countryRegister || "Global"}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  Status: <span style={{ color: "#d32f2f" }}>Out of Stock</span>
                </div>
              </div>
              <div style={{ padding: 10, background: "#fff3e0", borderRadius: 6, marginBottom: 12, fontSize: 11, color: "#e65100" }}>
                This product is currently out of stock. Send a message to the admin to request a restock.
              </div>
              <div>
                <label className="label">Your Message</label>
                <textarea className="input" rows={3} value={contactMsg}
                  onChange={e => setContactMsg(e.target.value)}
                  placeholder={`Hi, I'm interested in ${contactListing.title}. Please restock this product.`} />
              </div>
              {user && (
                <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
                  Name: {user.firstName} {user.lastName} · Email: {user.email}
                </div>
              )}
            </div>
            <div className="modal-foot" style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setContactListing(null); setContactMsg(""); }}
                style={{ flex: 1, padding: "8px 0", border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={() => {
                  const info = `User: ${user ? `${user.firstName} ${user.lastName} (${user.email})` : "Guest"}\nProduct: ${contactListing.title}\nPlatform: ${contactListing.platform}\nCategory: ${contactListing.category}\nMessage: ${contactMsg || "No message"}`;
                  alert("Message sent to admin!\n\n" + info);
                  setContactListing(null); setContactMsg("");
                }}>Send</button>
            </div>
          </div>
        </div>
      )}

      {showDeposit && user && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowDeposit(false)}>
          <div style={{ background: "#fff", borderRadius: 8, width: 360, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e5e5", fontWeight: 700, fontSize: 15 }}>Deposit Funds</div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const amt = parseFloat(depAmount);
              if (amt < 5) { alert("Minimum deposit is $5"); return; }
              setDepositing(true);
              const res = await fetch("/api/deposits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt, method: depMethod }) });
              const r = await res.json();
              setDepositing(false);
              if (r.success) { alert(`Deposited $${amt}. New balance: $${r.balance}`); setShowDeposit(false); setDepAmount(""); location.reload(); } else alert(r.error);
            }} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label">Method</label>
                <select value={depMethod} onChange={e => setDepMethod(e.target.value)} className="input">
                  <option value="crypto">Crypto (USDT/BTC/ETH)</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe (Card)</option>
                  <option value="manual">Manual Transfer</option>
                </select>
              </div>
              <div>
                <label className="label">Amount ($)</label>
                <input type="number" step="0.01" min="5" value={depAmount} onChange={e => setDepAmount(e.target.value)} className="input" required placeholder="5.00" />
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Minimum deposit: $5.00</div>
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>Current balance: <strong style={{ color: "#3ea136" }}>{money(user.balance)}</strong></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowDeposit(false)} style={{ flex: 1, padding: "8px 0", border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={depositing} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 4, background: "#3ea136", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{depositing ? "Processing..." : "Deposit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ChatWidget />
    </>
  );
}
